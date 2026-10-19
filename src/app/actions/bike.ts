"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const optionalText = (limit: number) => z.string().trim().max(limit).optional().transform((value) => value || null);
const optionalDate = z.string().optional().transform((value) => value || null).refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");
const optionalInteger = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === "" || value === undefined ? undefined : Number(value),
  z.number().int().min(minimum).max(maximum).optional(),
);

const bikeSchema = z.object({
  id: z.string().uuid().optional(),
  manufacturer: z.string().trim().min(1, "Manufacturer is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(120),
  name: optionalText(120),
  variant: optionalText(120),
  registration_number: optionalText(32),
  chassis_number: optionalText(80),
  engine_number: optionalText(80),
  manufacturing_year: optionalInteger(1885, 2100),
  purchase_date: optionalDate,
  purchase_price: z.preprocess((value) => value === "" || value === undefined ? undefined : Number(value), z.number().min(0).max(100000000).optional()),
  current_odometer: z.preprocess((value) => value === "" ? 0 : Number(value), z.number().int().min(0).max(5000000)),
  fuel_type: optionalText(40),
  engine_capacity_cc: optionalInteger(1, 10000),
  front_tyre_size: optionalText(40),
  rear_tyre_size: optionalText(40),
  insurance_provider: optionalText(120),
  insurance_expiry: optionalDate,
  puc_expiry: optionalDate,
  warranty_expiry: optionalDate,
  notes: optionalText(5000),
  correction_reason: optionalText(500),
});

export type BikeActionState = { success?: string; error?: string; fieldErrors?: Record<string, string[]> };

export async function saveBikeAction(_previous: BikeActionState, formData: FormData): Promise<BikeActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase in .env.local before saving a bike profile." };

  const parsed = bikeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the highlighted fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again to continue." };

  const { id, correction_reason: correctionReason, ...bikeValues } = parsed.data;
  let existingOdometer: number | null = null;
  if (id) {
    const { data: existing, error } = await supabase.from("bikes").select("id,current_odometer").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (error) return { error: "Unable to load the bike you are editing." };
    if (!existing) return { error: "That bike could not be found in your garage." };
    existingOdometer = existing.current_odometer;
    if (bikeValues.current_odometer < existing.current_odometer && !correctionReason) {
      return { error: "The odometer cannot decrease without an explicit correction reason." };
    }
  }

  const payload = { ...bikeValues, owner_id: user.id };
  const write = id
    ? await supabase.from("bikes").update(payload).eq("id", id).eq("owner_id", user.id).select("id").maybeSingle()
    : await supabase.from("bikes").insert(payload).select("id").single();
  if (write.error || !write.data) return { error: write.error?.message ?? "Unable to save this bike." };

  const bikeId = write.data.id;
  if (existingOdometer === null || existingOdometer !== bikeValues.current_odometer) {
    const { error: logError } = await supabase.from("odometer_logs").insert({
      owner_id: user.id,
      bike_id: bikeId,
      odometer: bikeValues.current_odometer,
      source: existingOdometer !== null && bikeValues.current_odometer < existingOdometer ? "correction" : "manual",
      correction_reason: correctionReason,
      notes: "Recorded from bike profile",
    });
    if (logError) return { error: "Bike saved, but the odometer history could not be updated. Please retry the reading." };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/maintenance");
  return { success: id ? "Bike profile updated." : "Bike added to your garage." };
}