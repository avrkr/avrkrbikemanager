import "server-only";

import { dateInIndia } from "@/lib/maintenance";
import { sendMaintenanceEmail } from "@/lib/notifications/email";
import { sendTelegramMaintenanceMessage } from "@/lib/notifications/telegram";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ReminderEvent = { key: string; status: string; due: string };

function daysUntil(date: string, today: string) {
  const due = Date.parse(`${date}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return Math.round((due - current) / 86400000);
}

function taskEvent(task: { next_due_date: string | null; next_due_odometer: number | null }, currentOdometer: number, today: string, remindersBeforeDays: number, mileageLeadKm: number, overdueEveryDays: number): ReminderEvent | null {
  const remainingDays = task.next_due_date ? daysUntil(task.next_due_date, today) : null;
  const remainingKm = task.next_due_odometer === null ? null : Number(task.next_due_odometer) - currentOdometer;
  const eventDue = (remainingDays !== null && remainingDays <= 0) || (remainingKm !== null && remainingKm <= 0);

  if (eventDue && ((remainingDays !== null && remainingDays < 0) || (remainingKm !== null && remainingKm < 0))) {
    const overdueDays = remainingDays !== null && remainingDays < 0 ? Math.abs(remainingDays) : 1;
    if (overdueDays !== 1 && (overdueDays - 1) % overdueEveryDays !== 0) return null;
    return { key: `overdue:${overdueDays}`, status: `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`, due: task.next_due_date || `${Math.max(0, remainingKm ?? 0)} km overdue` };
  }

  if (eventDue) return { key: `due:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}`, status: "due today", due: task.next_due_date || `${task.next_due_odometer?.toLocaleString("en-IN")} km` };

  const dateIsNear = remainingDays !== null && remainingDays === remindersBeforeDays;
  const mileageIsNear = remainingKm !== null && remainingKm > 0 && remainingKm <= mileageLeadKm;
  if (!dateIsNear && !mileageIsNear) return null;
  const label = dateIsNear ? `in ${remainingDays} days` : `within ${remainingKm} km`;
  return { key: `upcoming:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}`, status: `upcoming (${label})`, due: task.next_due_date || `${task.next_due_odometer?.toLocaleString("en-IN")} km` };
}

function dueDocumentEvent(expiryDate: string, today: string): ReminderEvent | null {
  const remainingDays = daysUntil(expiryDate, today);
  if (remainingDays < 0) return { key: `expired:${Math.abs(remainingDays)}`, status: `expired ${Math.abs(remainingDays)} day${remainingDays === -1 ? "" : "s"} ago`, due: expiryDate };
  if ([0, 3, 7, 30].includes(remainingDays)) return { key: `expires:${remainingDays}`, status: remainingDays === 0 ? "expires today" : `expires in ${remainingDays} days`, due: expiryDate };
  return null;
}

function makeDedupeKey(ownerId: string, entityId: string, scheduleVersion: string, eventKey: string, channel: string) {
  return `${ownerId}:${entityId}:${scheduleVersion}:${eventKey}:${channel}`;
}

async function deliver(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  ownerId: string;
  entityId: string;
  taskId?: string;
  documentId?: string;
  version: string;
  event: ReminderEvent;
  channel: "email" | "telegram";
  recipient: string;
  bike: string;
  task: string;
  odometer: number;
  estimatedCost: number | null;
}) {
  const dedupeKey = makeDedupeKey(input.ownerId, input.entityId, input.version, input.event.key, input.channel);
  const { data: inserted, error: insertError } = await input.admin.from("notification_logs").upsert({
    owner_id: input.ownerId,
    task_id: input.taskId ?? null,
    document_id: input.documentId ?? null,
    channel: input.channel,
    event_key: input.event.key,
    dedupe_key: dedupeKey,
    delivery_status: "pending",
  }, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id").maybeSingle();
  if (insertError) return "log-error" as const;
  let notificationId = inserted?.id;
  if (!notificationId) {
    const { data: existing } = await input.admin.from("notification_logs").select("id,delivery_status").eq("dedupe_key", dedupeKey).maybeSingle();
    if (!existing || existing.delivery_status === "sent") return "duplicate" as const;
    notificationId = existing.id;
  }

  const { data: claimed } = await input.admin.rpc("claim_notification", { p_notification_id: notificationId });
  if (!claimed) return "not-claimed" as const;
  const { data: log } = await input.admin.from("notification_logs").select("attempts").eq("id", notificationId).single();

  try {
    const message = { to: input.recipient, chatId: input.recipient, bike: input.bike, task: input.task, due: input.event.due, status: input.event.status, odometer: input.odometer, estimatedCost: input.estimatedCost };
    if (input.channel === "email") await sendMaintenanceEmail(message);
    else await sendTelegramMaintenanceMessage(message);
    await input.admin.from("notification_logs").update({ delivery_status: "sent", sent_at: new Date().toISOString(), next_attempt_at: null, error_message: null }).eq("id", notificationId);
    return "sent" as const;
  } catch (error) {
    const attempts = Number(log?.attempts ?? 1);
    const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1));
    const safeMessage = (error instanceof Error ? error.message : "Notification delivery failed.").replace(/(?:token|password|secret|key)=?\S*/gi, "[redacted]").slice(0, 300);
    await input.admin.from("notification_logs").update({
      delivery_status: "failed",
      error_message: safeMessage,
      next_attempt_at: attempts < 5 ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null,
    }).eq("id", notificationId);
    return "failed" as const;
  }
}

export async function runMaintenanceReminders() {
  const admin = createSupabaseAdminClient();
  const today = dateInIndia();
  const summary = { examined: 0, sent: 0, failed: 0, skipped: 0 };
  const { data: tasks, error: taskError } = await admin.from("maintenance_tasks").select("*").eq("is_active", true).neq("status", "completed");
  if (taskError) throw new Error("Unable to load maintenance tasks for reminders.");

  for (const task of tasks ?? []) {
    summary.examined += 1;
    const [{ data: bike }, { data: profile }, { data: preferences }] = await Promise.all([
      admin.from("bikes").select("name,manufacturer,model,current_odometer").eq("id", task.bike_id).eq("owner_id", task.owner_id).maybeSingle(),
      admin.from("profiles").select("email,telegram_chat_id").eq("id", task.owner_id).maybeSingle(),
      admin.from("notification_preferences").select("*").eq("user_id", task.owner_id).or(`task_id.is.null,task_id.eq.${task.id}`),
    ]);
    if (!bike || !profile) { summary.skipped += 1; continue; }
    const taskPreference = preferences?.find((item) => item.task_id === task.id);
    const preference = taskPreference ?? preferences?.find((item) => item.task_id === null);
    if (!preference) { summary.skipped += 1; continue; }
    const event = taskEvent(task, Number(bike.current_odometer ?? 0), today, preference.reminders_before_days, preference.mileage_lead_km, preference.overdue_every_days);
    if (!event) continue;
    const bikeName = bike.name || `${bike.manufacturer} ${bike.model}`;
    const version = `${task.updated_at}:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}`;
    const channels: Array<["email" | "telegram", string]> = [];
    if (preference.email_enabled && profile.email) channels.push(["email", profile.email]);
    if (preference.telegram_enabled && profile.telegram_chat_id) channels.push(["telegram", profile.telegram_chat_id]);
    for (const [channel, recipient] of channels) {
      const result = await deliver({ admin, ownerId: task.owner_id, entityId: task.id, taskId: task.id, version, event, channel, recipient, bike: bikeName, task: task.name, odometer: Number(bike.current_odometer ?? 0), estimatedCost: task.estimated_cost === null ? null : Number(task.estimated_cost) });
      if (result === "sent") summary.sent += 1;
      else if (result === "failed" || result === "log-error") summary.failed += 1;
      else summary.skipped += 1;
    }
  }

  const { data: documents, error: documentError } = await admin.from("documents").select("*").not("expiry_date", "is", null).in("document_type", ["insurance", "puc"]);
  if (documentError) throw new Error("Unable to load expiring documents for reminders.");
  for (const document of documents ?? []) {
    const event = dueDocumentEvent(document.expiry_date, today);
    if (!event) continue;
    const [{ data: bike }, { data: profile }, { data: preferences }] = await Promise.all([
      admin.from("bikes").select("name,manufacturer,model,current_odometer").eq("id", document.bike_id).eq("owner_id", document.owner_id).maybeSingle(),
      admin.from("profiles").select("email,telegram_chat_id").eq("id", document.owner_id).maybeSingle(),
      admin.from("notification_preferences").select("*").eq("user_id", document.owner_id).is("task_id", null).maybeSingle(),
    ]);
    if (!bike || !profile || !preferences) continue;
    const name = bike.name || `${bike.manufacturer} ${bike.model}`;
    const channels: Array<["email" | "telegram", string]> = [];
    if (preferences.email_enabled && profile.email) channels.push(["email", profile.email]);
    if (preferences.telegram_enabled && profile.telegram_chat_id) channels.push(["telegram", profile.telegram_chat_id]);
    for (const [channel, recipient] of channels) {
      const result = await deliver({ admin, ownerId: document.owner_id, entityId: document.id, documentId: document.id, version: document.expiry_date, event, channel, recipient, bike: name, task: `${document.document_type.toUpperCase()} expiry: ${document.title}`, odometer: Number(bike.current_odometer ?? 0), estimatedCost: null });
      if (result === "sent") summary.sent += 1;
      else if (result === "failed" || result === "log-error") summary.failed += 1;
      else summary.skipped += 1;
    }
  }
  return summary;
}