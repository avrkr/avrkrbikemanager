"use client";

import { useActionState } from "react";
import { saveNotificationPreferencesAction, type NotificationActionState } from "@/app/actions/notifications";

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function NotificationSettingsForm({ settings }: { settings: { emailEnabled: boolean; telegramEnabled: boolean; telegramChatId: string; remindersBeforeDays: number; mileageLeadKm: number; overdueEveryDays: number } }) {
  const [state, action, pending] = useActionState<NotificationActionState, FormData>(saveNotificationPreferencesAction, {});
  return <form action={action} className="rounded-md border border-[#303630] bg-[#191c19]">
    <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Reminder preferences</h2><p className="mt-1 text-xs text-[#929990]">Default settings apply unless a maintenance task overrides them.</p></div>
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      <label className="flex items-start gap-3 rounded-md border border-[#303630] bg-[#151815] p-3"><input type="checkbox" name="emailEnabled" defaultChecked={settings.emailEnabled} className="mt-0.5 size-4 accent-[#d8fa56]" /><span><span className="block text-xs font-medium">Email reminders</span><span className="mt-1 block text-[10px] leading-4 text-[#929990]">Delivered to your account email address.</span></span></label>
      <label className="flex items-start gap-3 rounded-md border border-[#303630] bg-[#151815] p-3"><input type="checkbox" name="telegramEnabled" defaultChecked={settings.telegramEnabled} className="mt-0.5 size-4 accent-[#d8fa56]" /><span><span className="block text-xs font-medium">Telegram reminders</span><span className="mt-1 block text-[10px] leading-4 text-[#929990]">Requires a bot token and your chat ID.</span></span></label>
      <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2" htmlFor="telegramChatId">Telegram chat ID<input id="telegramChatId" name="telegramChatId" maxLength={128} defaultValue={settings.telegramChatId} className={inputClass} placeholder="Your Telegram numeric chat ID" /></label>
      <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="remindersBeforeDays">Date reminder lead time (days)<input required id="remindersBeforeDays" name="remindersBeforeDays" type="number" min="0" max="90" defaultValue={settings.remindersBeforeDays} className={inputClass} /></label>
      <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="mileageLeadKm">Mileage reminder lead (km)<input required id="mileageLeadKm" name="mileageLeadKm" type="number" min="0" max="10000" defaultValue={settings.mileageLeadKm} className={inputClass} /></label>
      <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="overdueEveryDays">Repeat overdue reminder every (days)<input required id="overdueEveryDays" name="overdueEveryDays" type="number" min="1" max="30" defaultValue={settings.overdueEveryDays} className={inputClass} /></label>
    </div>
    <div className="flex flex-col gap-3 border-t border-[#303630] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p role="status" className={`text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? "Daily reminder checks run at 9:00 AM India Standard Time."}</p><button disabled={pending} className="h-10 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] disabled:opacity-60">{pending ? "Saving…" : "Save preferences"}</button></div>
  </form>;
}