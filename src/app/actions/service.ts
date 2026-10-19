"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const optionalString = (limit: number) => z.string().trim().max(limit).optional().transform((value) => value || null);
const optionalNumber = z.preprocess((value) => value === "" || value === undefined ? null : Number(value), z.number().min(0).max(10000000).nullable());

const serviceSchema = z.object({
  bikeId: z.string().uuid(),
  maintenanceTaskId: z.string().optional().transform((value) => value || null),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a service date"),
  odometer: z.coerce.number().int().min(0).max(5000000),
  workshop: optionalString(160),
  mechanic: optionalString(120),
  partsReplaced: optionalString(2000),
  workPerformed: optionalString(5000),
  oilBrand: optionalString(100),
  oilGrade: optionalString(60),
  oilQuantityLitres: optionalNumber,
  oilCost: optionalNumber,
  labourCost: optionalNumber,
  totalCost: z.coerce.number().min(0).max(100000000),
  notes: optionalString(5000),
});

export type ServiceActionState = { success?: string; error?: string; fieldErrors?: Record<string, string[]> };

export async function createServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase and apply the migration before recording service." };
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the service details and try again.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again to continue." };
  const { data: bike } = await supabase.from("bikes").select("id,current_odometer").eq("id", parsed.data.bikeId).eq("owner_id", user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };

  const { error } = await supabase.rpc("record_service", {
    p_bike_id: bike.id,
    p_task_id: parsed.data.maintenanceTaskId,
    p_service_date: parsed.data.serviceDate,
    p_odometer: parsed.data.odometer,
    p_workshop: parsed.data.workshop,
    p_mechanic: parsed.data.mechanic,
    p_parts_replaced: parsed.data.partsReplaced,
    p_work_performed: parsed.data.workPerformed,
    p_oil_brand: parsed.data.oilBrand,
    p_oil_grade: parsed.data.oilGrade,
    p_oil_quantity_litres: parsed.data.oilQuantityLitres,
    p_oil_cost: parsed.data.oilCost,
    p_labour_cost: parsed.data.labourCost,
    p_total_cost: parsed.data.totalCost,
    p_notes: parsed.data.notes,
  });
  if (error) return { error: error.message.includes("record_service") ? "Apply the latest Supabase migration before recording service." : error.message };

  revalidatePath("/");
  revalidatePath("/maintenance");
  revalidatePath("/services");
  revalidatePath("/expenses");
  return { success: "Service saved. The task schedule and odometer were updated." };
}

export async function updateServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Supabase is not configured." };
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = serviceSchema.omit({ bikeId: true, maintenanceTaskId: true }).safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) return { error: "Check the service details and try again." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const { data: existing } = await supabase.from("service_records").select("id,maintenance_task_id,bike_id,owner_id").eq("id", id.data).eq("owner_id", user.id).maybeSingle();
  if (!existing) return { error: "Service record not found." };
  const { error } = await supabase.from("service_records").update({
    service_date: parsed.data.serviceDate,
    odometer: parsed.data.odometer,
    workshop: parsed.data.workshop,
    mechanic: parsed.data.mechanic,
    parts_replaced: parsed.data.partsReplaced,
    work_performed: parsed.data.workPerformed,
    oil_brand: parsed.data.oilBrand,
    oil_grade: parsed.data.oilGrade,
    oil_quantity_litres: parsed.data.oilQuantityLitres,
    oil_cost: parsed.data.oilCost,
    labour_cost: parsed.data.labourCost,
    total_cost: parsed.data.totalCost,
    notes: parsed.data.notes,
  }).eq("id", id.data).eq("owner_id", user.id);
  if (error) return { error: "Unable to update this service record." };

  const { error: expenseError } = await supabase.from("expenses").update({
    expense_date: parsed.data.serviceDate,
    description: parsed.data.workPerformed || "Service visit",
    amount: parsed.data.totalCost,
    odometer: parsed.data.odometer,
  }).eq("service_record_id", id.data).eq("owner_id", user.id);
  if (expenseError) return { error: "Service updated, but its linked expense could not be synchronized." };

  if (existing.maintenance_task_id) {
    const { data: task } = await supabase.from("maintenance_tasks").select("interval_days,interval_km").eq("id", existing.maintenance_task_id).eq("owner_id", user.id).maybeSingle();
    if (task) {
      const dueDate = task.interval_days ? new Date(`${parsed.data.serviceDate}T12:00:00Z`) : null;
      if (dueDate && task.interval_days) dueDate.setUTCDate(dueDate.getUTCDate() + task.interval_days);
      await supabase.from("maintenance_tasks").update({
        last_completed_date: parsed.data.serviceDate,
        last_completed_odometer: parsed.data.odometer,
        next_due_date: dueDate?.toISOString().slice(0, 10) ?? null,
        next_due_odometer: task.interval_km ? parsed.data.odometer + task.interval_km : null,
        status: "upcoming",
      }).eq("id", existing.maintenance_task_id).eq("owner_id", user.id);
    }
  }
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/maintenance");
  return { success: "Service record updated." };
}

export async function deleteServiceAction(_previous: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Supabase is not configured." };
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid service record." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const { data: record } = await supabase.from("service_records").select("id,maintenance_task_id,owner_id").eq("id", id.data).eq("owner_id", user.id).maybeSingle();
  if (!record) return { error: "Service record not found." };
  const { error: expenseError } = await supabase.from("expenses").delete().eq("service_record_id", id.data).eq("owner_id", user.id);
  if (expenseError) return { error: "Unable to remove the linked service expense." };
  const { error } = await supabase.from("service_records").delete().eq("id", id.data).eq("owner_id", user.id);
  if (error) return { error: "Unable to delete this service record." };

  if (record.maintenance_task_id) {
    const { data: latest } = await supabase.from("service_records").select("service_date,odometer").eq("maintenance_task_id", record.maintenance_task_id).eq("owner_id", user.id).order("service_date", { ascending: false }).limit(1).maybeSingle();
    const { data: task } = await supabase.from("maintenance_tasks").select("interval_days,interval_km").eq("id", record.maintenance_task_id).eq("owner_id", user.id).maybeSingle();
    if (task) {
      const dueDate = latest && task.interval_days ? new Date(`${latest.service_date}T12:00:00Z`) : null;
      if (dueDate && task.interval_days) dueDate.setUTCDate(dueDate.getUTCDate() + task.interval_days);
      await supabase.from("maintenance_tasks").update({
        last_completed_date: latest?.service_date ?? null,
        last_completed_odometer: latest?.odometer ?? null,
        next_due_date: dueDate?.toISOString().slice(0, 10) ?? null,
        next_due_odometer: latest && task.interval_km ? latest.odometer + task.interval_km : null,
        status: latest ? "upcoming" : "due",
      }).eq("id", record.maintenance_task_id).eq("owner_id", user.id);
    }
  }
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/maintenance");
  return { success: "Service record deleted." };
}