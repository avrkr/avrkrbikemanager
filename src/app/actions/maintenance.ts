"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { addDaysToDate, dateInIndia, getMaintenanceStatus } from "@/lib/maintenance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  bikeId: z.string().uuid(),
  typeId: z.string().optional(),
  customName: z.string().trim().max(120).optional(),
  customCategory: z.string().trim().max(60).optional(),
  lastCompletedDate: z.string().optional(),
  lastCompletedOdometer: z.preprocess((value) => value === "" ? undefined : Number(value), z.number().int().min(0).max(5000000).optional()),
  intervalDays: z.preprocess((value) => value === "" ? undefined : Number(value), z.number().int().positive().max(3650).optional()),
  intervalKm: z.preprocess((value) => value === "" ? undefined : Number(value), z.number().int().positive().max(500000).optional()),
  estimatedCost: z.preprocess((value) => value === "" ? undefined : Number(value), z.number().min(0).max(100000000).optional()),
  priority: z.enum(["low", "normal", "high", "critical"]),
  notes: z.string().trim().max(2000).optional(),
}).refine((values) => values.intervalDays || values.intervalKm, { message: "Set a date interval, kilometre interval, or both.", path: ["intervalDays"] });

export type MaintenanceActionState = { success?: string; error?: string; fieldErrors?: Record<string, string[]> };

export async function createMaintenanceTaskAction(_previous: MaintenanceActionState, formData: FormData): Promise<MaintenanceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase and apply the migration before creating schedules." };
  const raw = Object.fromEntries(formData);
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { error: "Check the task details and try again.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again to continue." };

  const { data: bike, error: bikeError } = await supabase.from("bikes").select("id,current_odometer").eq("id", parsed.data.bikeId).eq("owner_id", user.id).maybeSingle();
  if (bikeError || !bike) return { error: "Choose a motorcycle in your garage before adding maintenance." };

  let name: string;
  let category: string;
  let maintenanceTypeId: string | null = null;

  if (parsed.data.typeId && parsed.data.typeId !== "custom") {
    const { data: type, error } = await supabase.from("maintenance_types").select("id,name,category").eq("id", parsed.data.typeId).maybeSingle();
    if (error || !type) return { error: "That maintenance category is no longer available. Refresh and try again." };
    name = type.name;
    category = type.category;
    maintenanceTypeId = type.id;
  } else {
    name = parsed.data.customName?.trim() ?? "";
    category = parsed.data.customCategory?.trim() ?? "Custom";
    if (!name) return { error: "Enter a name for your custom maintenance task." };
    const { data: customType, error } = await supabase.from("maintenance_types").insert({ owner_id: user.id, name, category }).select("id").single();
    if (error || !customType) return { error: "Unable to save the custom maintenance category." };
    maintenanceTypeId = customType.id;
  }

  const today = dateInIndia();
  const completedDate = parsed.data.lastCompletedDate || today;
  const completedOdometer = parsed.data.lastCompletedOdometer ?? bike.current_odometer;
  if (completedOdometer > bike.current_odometer) return { error: "Last completed odometer cannot exceed the current odometer. Update the bike reading first." };

  const { error } = await supabase.from("maintenance_tasks").insert({
    owner_id: user.id,
    bike_id: bike.id,
    maintenance_type_id: maintenanceTypeId,
    name,
    category,
    last_completed_date: completedDate,
    last_completed_odometer: completedOdometer,
    interval_days: parsed.data.intervalDays ?? null,
    interval_km: parsed.data.intervalKm ?? null,
    next_due_date: parsed.data.intervalDays ? addDaysToDate(completedDate, parsed.data.intervalDays) : null,
    next_due_odometer: parsed.data.intervalKm ? completedOdometer + parsed.data.intervalKm : null,
    estimated_cost: parsed.data.estimatedCost ?? null,
    priority: parsed.data.priority,
    notes: parsed.data.notes || null,
  });
  if (error) return { error: "Unable to create this maintenance task. Confirm the database migration has been applied." };

  revalidatePath("/");
  revalidatePath("/maintenance");
  return { success: "Maintenance schedule created." };
}

export async function updateMaintenanceTaskAction(_previous: MaintenanceActionState, formData: FormData): Promise<MaintenanceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase before editing schedules." };
  const schema = z.object({
    taskId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(60),
    lastCompletedDate: z.string().optional(),
    lastCompletedOdometer: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().min(0).max(5000000).nullable()),
    intervalDays: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().positive().max(3650).nullable()),
    intervalKm: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().positive().max(500000).nullable()),
    estimatedCost: z.preprocess((value) => value === "" ? null : Number(value), z.number().min(0).max(100000000).nullable()),
    priority: z.enum(["low", "normal", "high", "critical"]),
    notes: z.string().trim().max(2000).optional(),
  }).refine((values) => values.intervalDays || values.intervalKm, { message: "Keep at least one interval.", path: ["intervalDays"] });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the schedule details." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again." };
  const { data: task } = await supabase.from("maintenance_tasks").select("id,bike_id,owner_id").eq("id", parsed.data.taskId).eq("owner_id", user.id).maybeSingle();
  if (!task) return { error: "Maintenance task not found." };
  const { data: bike } = await supabase.from("bikes").select("current_odometer").eq("id", task.bike_id).eq("owner_id", user.id).maybeSingle();
  if (!bike) return { error: "Bike not found." };

  const lastDate = parsed.data.lastCompletedDate || null;
  const lastOdometer = parsed.data.lastCompletedOdometer;
  const nextDueDate = lastDate && parsed.data.intervalDays ? addDaysToDate(lastDate, parsed.data.intervalDays) : null;
  const nextDueOdometer = lastOdometer !== null && parsed.data.intervalKm ? lastOdometer + parsed.data.intervalKm : null;
  const nextStatus = getMaintenanceStatus({ next_due_date: nextDueDate, next_due_odometer: nextDueOdometer }, bike.current_odometer);
  const { error } = await supabase.from("maintenance_tasks").update({
    name: parsed.data.name,
    category: parsed.data.category,
    last_completed_date: lastDate,
    last_completed_odometer: lastOdometer,
    interval_days: parsed.data.intervalDays,
    interval_km: parsed.data.intervalKm,
    next_due_date: nextDueDate,
    next_due_odometer: nextDueOdometer,
    estimated_cost: parsed.data.estimatedCost,
    priority: parsed.data.priority,
    notes: parsed.data.notes || null,
    status: nextStatus,
  }).eq("id", task.id).eq("owner_id", user.id);
  if (error) return { error: "Unable to update this schedule." };
  revalidatePath("/");
  revalidatePath("/maintenance");
  revalidatePath("/notifications");
  return { success: "Maintenance schedule updated." };
}

export async function deleteMaintenanceTaskAction(_previous: MaintenanceActionState, formData: FormData): Promise<MaintenanceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Supabase is not configured." };
  const taskId = z.string().uuid().safeParse(formData.get("taskId"));
  if (!taskId.success) return { error: "Invalid maintenance task." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const { error } = await supabase.from("maintenance_tasks").update({ is_active: false }).eq("id", taskId.data).eq("owner_id", user.id);
  if (error) return { error: "Unable to archive this maintenance schedule." };
  revalidatePath("/");
  revalidatePath("/maintenance");
  return { success: "Maintenance schedule archived." };
}