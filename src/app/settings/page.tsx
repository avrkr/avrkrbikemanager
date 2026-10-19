import { Suspense } from "react";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import { signOutAction } from "@/app/actions/notifications";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function SettingsContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs text-[#f3c879]">Configure Supabase to manage your notification settings.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("email,telegram_chat_id,timezone").eq("id", user.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).is("task_id", null).maybeSingle(),
  ]);
  const settings = {
    emailEnabled: preferences?.email_enabled ?? true,
    telegramEnabled: preferences?.telegram_enabled ?? false,
    telegramChatId: profile?.telegram_chat_id ?? "",
    remindersBeforeDays: preferences?.reminders_before_days ?? 3,
    mileageLeadKm: preferences?.mileage_lead_km ?? 200,
    overdueEveryDays: preferences?.overdue_every_days ?? 3,
  };

  return <>
    <section className="mb-5 rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#252b22] text-[#d8fa56]"><ShieldCheck size={18} /></span><div><h2 className="text-sm font-semibold">Account</h2><p className="mt-1 text-xs text-[#929990]">{profile?.email ?? user.email}</p><p className="mt-1 text-[10px] text-[#7f877e]">Timezone: {profile?.timezone ?? "Asia/Kolkata"}</p></div></div></section>
    <NotificationSettingsForm settings={settings} />
    <form action={signOutAction} className="mt-5 flex items-center justify-between rounded-md border border-[#303630] bg-[#191c19] p-4"><div><p className="text-xs font-medium">Sign out</p><p className="mt-1 text-[10px] text-[#929990]">End this session on this device.</p></div><button className="inline-flex h-9 items-center gap-2 rounded-md border border-[#394039] px-3 text-xs text-[#d0d5cc] hover:bg-white/[0.04]"><LogOut size={14} /> Sign out</button></form>
  </>;
}

export default function SettingsPage() {
  return <AppShell><SectionHeading eyebrow="Your preferences" title="Settings" detail="Control when and how maintenance updates reach you." action={<Bell size={18} className="text-[#a8bd64]" />} /><Suspense fallback={<div className="h-80 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><SettingsContent /></Suspense></AppShell>;
}