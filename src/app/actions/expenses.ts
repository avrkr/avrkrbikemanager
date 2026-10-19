"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const expenseSchema = z.object({
  bikeId: z.string().uuid(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["maintenance", "parts", "repair", "insurance", "accessories", "other"]),
  description: z.string().trim().min(1).max(160),
  amount: z.coerce.number().min(0).max(100000000),
  odometer: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().min(0).max(5000000).nullable()),
  notes: z.string().trim().max(2000).optional(),
});

const fuelSchema = z.object({
  bikeId: z.string().uuid(),
  refuelledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  odometer: z.coerce.number().int().min(0).max(5000000),
  litres: z.coerce.number().positive().max(1000),
  pricePerLitre: z.coerce.number().min(0).max(10000),
  fuelStation: z.string().trim().max(160).optional(),
  fullTank: z.boolean(),
});

const odometerSchema = z.object({
  bikeId: z.string().uuid(),
  odometer: z.coerce.number().int().min(0).max(5000000),
  correctionReason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ExpenseActionState = { success?: string; error?: string };

async function getAuthenticatedSupabase() {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase and apply the migration before saving records." } as const;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Your session has expired. Sign in again to continue." } as const;
  return { supabase, user } as const;
}

export async function createExpenseAction(_previous: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the expense details and try again." };
  const auth = await getAuthenticatedSupabase();
  if ("error" in auth) return auth;
  const { data: bike } = await auth.supabase.from("bikes").select("id,current_odometer").eq("id", parsed.data.bikeId).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };
  if (parsed.data.odometer !== null && parsed.data.odometer < bike.current_odometer) return { error: "Expense odometer cannot be below the current reading. Use the correction form if this is an odometer correction." };

  const { error } = await auth.supabase.from("expenses").insert({
    owner_id: auth.user.id,
    bike_id: bike.id,
    expense_date: parsed.data.expenseDate,
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount,
    odometer: parsed.data.odometer,
    notes: parsed.data.notes || null,
  });
  if (error) return { error: "Unable to save this expense." };
  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: "Expense recorded." };
}

export async function createFuelAction(_previous: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const parsed = fuelSchema.safeParse({ ...Object.fromEntries(formData), fullTank: formData.get("fullTank") === "on" });
  if (!parsed.success) return { error: "Check the fuel details and try again." };
  const auth = await getAuthenticatedSupabase();
  if ("error" in auth) return auth;
  const { data: bike } = await auth.supabase.from("bikes").select("id").eq("id", parsed.data.bikeId).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };

  const { error } = await auth.supabase.rpc("record_fuel_entry", {
    p_bike_id: bike.id,
    p_refuelled_at: parsed.data.refuelledAt,
    p_odometer: parsed.data.odometer,
    p_litres: parsed.data.litres,
    p_price_per_litre: parsed.data.pricePerLitre,
    p_fuel_station: parsed.data.fuelStation || null,
    p_full_tank: parsed.data.fullTank,
  });
  if (error) return { error: error.message.includes("record_fuel_entry") ? "Apply the latest Supabase migration before adding fuel logs." : error.message };
  revalidatePath("/");
  revalidatePath("/expenses");
  return { success: "Fuel stop recorded; expense and odometer history updated." };
}

export async function updateOdometerAction(_previous: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const parsed = odometerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid odometer reading." };
  const auth = await getAuthenticatedSupabase();
  if ("error" in auth) return auth;
  const { data: bike } = await auth.supabase.from("bikes").select("id").eq("id", parsed.data.bikeId).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };
  const { error } = await auth.supabase.rpc("record_odometer_reading", {
    p_bike_id: bike.id,
    p_odometer: parsed.data.odometer,
    p_correction_reason: parsed.data.correctionReason || null,
    p_notes: parsed.data.notes || null,
  });
  if (error) return { error: error.message.includes("record_odometer_reading") ? "Apply the latest Supabase migration before logging odometer readings." : error.message };
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/maintenance");
  return { success: "Odometer reading saved." };
}