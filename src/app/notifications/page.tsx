import { Suspense } from "react";
import { Bell, Mail, MessageCircle, Settings2 } from "lucide-react";
import Link from "next/link";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function NotificationContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs text-[#f3c879]">Configure Supabase to view reminder history.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: logs } = await supabase.from("notification_logs").select("id,channel,event_key,delivery_status,attempts,sent_at,error_message,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50);
  const statusStyle: Record<string, string> = { sent: "text-[#91c5a4]", failed: "text-[#ff958b]", pending: "text-[#f3c879]", sending: "text-[#f3c879]" };
  return <section className="overflow-hidden rounded-md border border-[#303630] bg-[#191c19]">
    <div className="flex items-center justify-between border-b border-[#303630] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold">Delivery history</h2><p className="mt-1 text-xs text-[#929990]">Last 50 email and Telegram delivery attempts.</p></div><Link href="/settings" aria-label="Notification settings" title="Notification settings" className="grid size-9 place-items-center rounded-md border border-[#394039] text-[#a3aaa1] hover:bg-white/[0.04]"><Settings2 size={16} /></Link></div>
    {logs?.length ? <div className="divide-y divide-[#303630]">{logs.map((log) => <article key={log.id} className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 text-[#a8bd64]">{log.channel === "email" ? <Mail size={15} /> : <MessageCircle size={15} />}</span><div className="min-w-0"><p className="break-words text-xs font-medium capitalize">{log.event_key.replaceAll(":", " · ").replaceAll("_", " ")}</p>{log.error_message && <p className="mt-1 text-[10px] text-[#ff958b]">{log.error_message}</p>}<p className="mt-1 text-[10px] text-[#7f877e]">{log.attempts} {log.attempts === 1 ? "attempt" : "attempts"}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><time className="text-[10px] text-[#7f877e]">{new Date(log.sent_at ?? log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time><span className={`text-[10px] font-semibold uppercase ${statusStyle[log.delivery_status] ?? "text-[#929990]"}`}>{log.delivery_status}</span></div></article>)}</div> : <div className="px-5 py-10 text-center"><Bell className="mx-auto text-[#a8bd64]" size={21} /><p className="mt-3 text-sm font-medium">No reminders delivered yet</p><p className="mt-1 text-xs text-[#929990]">Reminders appear after a task or document is approaching its due date.</p></div>}
  </section>;
}

export default function NotificationsPage() {
  return <AppShell><SectionHeading eyebrow="Your alerts" title="Notifications" detail="See what has reached your inbox and connected Telegram chat." action={<Link href="/settings" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#394039] px-3 text-xs text-[#d0d5cc] hover:bg-white/[0.04]"><Settings2 size={15} /> Settings</Link>} /><Suspense fallback={<div className="h-72 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><NotificationContent /></Suspense></AppShell>;
}