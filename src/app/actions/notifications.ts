"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const preferencesSchema = z.object({
  telegramChatId: z.string().trim().max(128).optional(),
  remindersBeforeDays: z.coerce.number().int().min(0).max(90),
  mileageLeadKm: z.coerce.number().int().min(0).max(10000),
  overdueEveryDays: z.coerce.number().int().min(1).max(30),
});

export type NotificationActionState = { success?: string; error?: string };

export async function saveNotificationPreferencesAction(_previous: NotificationActionState, formData: FormData): Promise<NotificationActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase before saving notification settings." };
  const parsed = preferencesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the reminder settings and try again." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Sign in again." };

  const { error: profileError } = await supabase.from("profiles").update({ telegram_chat_id: parsed.data.telegramChatId || null }).eq("id", user.id);
  if (profileError) return { error: "Unable to save your Telegram destination." };
  const values = {
    user_id: user.id,
    task_id: null,
    email_enabled: formData.get("emailEnabled") === "on",
    telegram_enabled: formData.get("telegramEnabled") === "on",
    reminders_before_days: parsed.data.remindersBeforeDays,
    mileage_lead_km: parsed.data.mileageLeadKm,
    overdue_every_days: parsed.data.overdueEveryDays,
  };
  const { data: existing } = await supabase.from("notification_preferences").select("id").eq("user_id", user.id).is("task_id", null).maybeSingle();
  const preferenceWrite = existing
    ? await supabase.from("notification_preferences").update(values).eq("id", existing.id).eq("user_id", user.id)
    : await supabase.from("notification_preferences").insert(values);
  if (preferenceWrite.error) return { error: "Unable to save your reminder preferences." };
  revalidatePath("/settings");
  revalidatePath("/notifications");
  return { success: "Notification preferences saved." };
}

export async function signOutAction() {
  if (hasSupabaseConfiguration()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/auth/sign-in");
}