import "server-only";

import { dateInIndia } from "@/lib/maintenance";
import { sendMaintenanceEmail } from "@/lib/notifications/email";
import { sendTelegramMaintenanceMessage } from "@/lib/notifications/telegram";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ReminderEvent = { key: string; status: string; due: string };
type ReminderPayload = { recipient: string; bike: string; task: string; due: string; status: string; odometer: number; estimatedCost: number | null; bikeExpiryField?: "insurance_expiry" | "puc_expiry" };

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
    const isDateOverdue = remainingDays !== null && remainingDays < 0;
    if (!isDateOverdue) {
      const dayIndex = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000);
      const reminderWindow = Math.floor(dayIndex / overdueEveryDays);
      return { key: `overdue-mileage:${reminderWindow}`, status: `${Math.abs(remainingKm ?? 0)} km overdue`, due: `${task.next_due_odometer?.toLocaleString("en-IN")} km` };
    }
    const overdueDays = Math.abs(remainingDays);
    const reminderWindow = Math.floor((overdueDays - 1) / overdueEveryDays);
    return { key: `overdue:${reminderWindow}`, status: `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`, due: task.next_due_date || `${Math.max(0, remainingKm ?? 0)} km overdue` };
  }

  if (eventDue) return { key: `due:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}`, status: "due today", due: task.next_due_date || `${task.next_due_odometer?.toLocaleString("en-IN")} km` };

  const dateIsNear = remainingDays !== null && remainingDays === remindersBeforeDays;
  const mileageIsNear = remainingKm !== null && remainingKm > 0 && remainingKm <= mileageLeadKm;
  if (!dateIsNear && !mileageIsNear) return null;
  const label = dateIsNear ? `in ${remainingDays} days` : `within ${remainingKm} km`;
  return { key: `upcoming:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}`, status: `upcoming (${label})`, due: task.next_due_date || `${task.next_due_odometer?.toLocaleString("en-IN")} km` };
}

function dueDocumentEvent(expiryDate: string, today: string, overdueEveryDays: number): ReminderEvent | null {
  const remainingDays = daysUntil(expiryDate, today);
  if (remainingDays < 0) {
    const overdueDays = Math.abs(remainingDays);
    const reminderWindow = Math.floor((overdueDays - 1) / overdueEveryDays);
    return { key: `expired:${reminderWindow}`, status: `expired ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago`, due: expiryDate };
  }
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
  bikeId?: string;
  documentId?: string;
  version: string;
  event: ReminderEvent;
  channel: "email" | "telegram";
  recipient: string;
  bike: string;
  task: string;
  odometer: number;
  estimatedCost: number | null;
  bikeExpiryField?: "insurance_expiry" | "puc_expiry";
}) {
  const dedupeKey = makeDedupeKey(input.ownerId, input.entityId, input.version, input.event.key, input.channel);
  const { data: inserted, error: insertError } = await input.admin.from("notification_logs").upsert({
    owner_id: input.ownerId,
    task_id: input.taskId ?? null,
    bike_id: input.bikeId ?? null,
    document_id: input.documentId ?? null,
    channel: input.channel,
    event_key: input.event.key,
    dedupe_key: dedupeKey,
    schedule_version: input.version,
    payload: { recipient: input.recipient, bike: input.bike, task: input.task, due: input.event.due, status: input.event.status, odometer: input.odometer, estimatedCost: input.estimatedCost, bikeExpiryField: input.bikeExpiryField },
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

async function retryFailedNotifications(admin: ReturnType<typeof createSupabaseAdminClient>, today: string, summary: { examined: number; sent: number; failed: number; skipped: number }) {
  const now = new Date().toISOString();
  const { data: notifications, error } = await admin.from("notification_logs").select("*").in("delivery_status", ["pending", "failed", "sending"]).lt("attempts", 5).or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`).order("created_at").limit(100);
  if (error) throw new Error("Unable to load pending notification retries.");

  for (const notification of notifications ?? []) {
    summary.examined += 1;
    const payload = notification.payload as ReminderPayload;
    if (!payload?.recipient || !payload.task || !payload.bike) {
      await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because message details are incomplete." }).eq("id", notification.id);
      summary.skipped += 1;
      continue;
    }

    let enabled = false;
    let currentRecipient = "";
    if (notification.task_id) {
      const [{ data: task }, { data: bike }, { data: profile }, { data: preferences }] = await Promise.all([
        admin.from("maintenance_tasks").select("id,owner_id,is_active,status,updated_at,next_due_date,next_due_odometer").eq("id", notification.task_id).eq("owner_id", notification.owner_id).maybeSingle(),
        admin.from("bikes").select("current_odometer").eq("id", notification.bike_id).eq("owner_id", notification.owner_id).maybeSingle(),
        admin.from("profiles").select("email,telegram_chat_id").eq("id", notification.owner_id).maybeSingle(),
        admin.from("notification_preferences").select("*").eq("user_id", notification.owner_id).or(`task_id.is.null,task_id.eq.${notification.task_id}`),
      ]);
      const version = task ? `${task.updated_at}:${task.next_due_date ?? ""}:${task.next_due_odometer ?? ""}` : "";
      if (!task || !task.is_active || task.status === "completed" || version !== notification.schedule_version) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the maintenance schedule changed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      const preference = preferences?.find((item) => item.task_id === task.id) ?? preferences?.find((item) => item.task_id === null);
      const currentEvent = task && bike && preference ? taskEvent(task, Number(bike.current_odometer ?? 0), today, preference.reminders_before_days, preference.mileage_lead_km, preference.overdue_every_days) : null;
      if (!currentEvent || currentEvent.key !== notification.event_key) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the reminder window changed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      enabled = notification.channel === "email" ? Boolean(preference?.email_enabled) : Boolean(preference?.telegram_enabled);
      currentRecipient = notification.channel === "email" ? profile?.email ?? "" : profile?.telegram_chat_id ?? "";
    } else if (notification.document_id) {
      const [{ data: document }, { data: profile }, { data: preference }] = await Promise.all([
        admin.from("documents").select("id,owner_id,expiry_date").eq("id", notification.document_id).eq("owner_id", notification.owner_id).maybeSingle(),
        admin.from("profiles").select("email,telegram_chat_id").eq("id", notification.owner_id).maybeSingle(),
        admin.from("notification_preferences").select("*").eq("user_id", notification.owner_id).is("task_id", null).maybeSingle(),
      ]);
      if (!document || document.expiry_date !== notification.schedule_version) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the document expiry changed or the document was removed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      if (!preference || dueDocumentEvent(document.expiry_date, today, preference.overdue_every_days)?.key !== notification.event_key) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the document reminder window changed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      enabled = notification.channel === "email" ? Boolean(preference?.email_enabled) : Boolean(preference?.telegram_enabled);
      currentRecipient = notification.channel === "email" ? profile?.email ?? "" : profile?.telegram_chat_id ?? "";
    } else if (notification.bike_id && payload.bikeExpiryField) {
      const [{ data: bike }, { data: profile }, { data: preference }] = await Promise.all([
        admin.from("bikes").select("id,owner_id,insurance_expiry,puc_expiry").eq("id", notification.bike_id).eq("owner_id", notification.owner_id).maybeSingle(),
        admin.from("profiles").select("email,telegram_chat_id").eq("id", notification.owner_id).maybeSingle(),
        admin.from("notification_preferences").select("*").eq("user_id", notification.owner_id).is("task_id", null).maybeSingle(),
      ]);
      if (!bike || bike[payload.bikeExpiryField] !== notification.schedule_version) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the bike document expiry changed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      if (!preference || dueDocumentEvent(bike[payload.bikeExpiryField], today, preference.overdue_every_days)?.key !== notification.event_key) {
        await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because the bike document reminder window changed." }).eq("id", notification.id);
        summary.skipped += 1;
        continue;
      }
      enabled = notification.channel === "email" ? Boolean(preference?.email_enabled) : Boolean(preference?.telegram_enabled);
      currentRecipient = notification.channel === "email" ? profile?.email ?? "" : profile?.telegram_chat_id ?? "";
    }

    if (!enabled || !currentRecipient) {
      await admin.from("notification_logs").update({ delivery_status: "failed", next_attempt_at: null, error_message: "Retry canceled because this notification channel is disabled or no longer configured." }).eq("id", notification.id);
      summary.skipped += 1;
      continue;
    }
    const { data: claimed } = await admin.rpc("claim_notification", { p_notification_id: notification.id });
    if (!claimed) { summary.skipped += 1; continue; }
    try {
      const message = { ...payload, to: currentRecipient, chatId: currentRecipient };
      if (notification.channel === "email") await sendMaintenanceEmail(message);
      else await sendTelegramMaintenanceMessage(message);
      await admin.from("notification_logs").update({ delivery_status: "sent", sent_at: new Date().toISOString(), next_attempt_at: null, error_message: null }).eq("id", notification.id);
      summary.sent += 1;
    } catch (caught) {
      const attempts = Number(notification.attempts) + 1;
      const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1));
      const safeMessage = (caught instanceof Error ? caught.message : "Notification delivery failed.").replace(/(?:token|password|secret|key)=?\S*/gi, "[redacted]").slice(0, 300);
      await admin.from("notification_logs").update({ delivery_status: "failed", error_message: safeMessage, next_attempt_at: attempts < 5 ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null }).eq("id", notification.id);
      summary.failed += 1;
    }
  }
}

export async function runMaintenanceReminders() {
  const admin = createSupabaseAdminClient();
  const today = dateInIndia();
  const summary = { examined: 0, sent: 0, failed: 0, skipped: 0 };
  await retryFailedNotifications(admin, today, summary);
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
      const result = await deliver({ admin, ownerId: task.owner_id, entityId: task.id, taskId: task.id, bikeId: task.bike_id, version, event, channel, recipient, bike: bikeName, task: task.name, odometer: Number(bike.current_odometer ?? 0), estimatedCost: task.estimated_cost === null ? null : Number(task.estimated_cost) });
      if (result === "sent") summary.sent += 1;
      else if (result === "failed" || result === "log-error") summary.failed += 1;
      else summary.skipped += 1;
    }
  }

  const { data: documents, error: documentError } = await admin.from("documents").select("*").not("expiry_date", "is", null).in("document_type", ["insurance", "puc"]);
  if (documentError) throw new Error("Unable to load expiring documents for reminders.");
  for (const document of documents ?? []) {
    const [{ data: bike }, { data: profile }, { data: preferences }] = await Promise.all([
      admin.from("bikes").select("name,manufacturer,model,current_odometer").eq("id", document.bike_id).eq("owner_id", document.owner_id).maybeSingle(),
      admin.from("profiles").select("email,telegram_chat_id").eq("id", document.owner_id).maybeSingle(),
      admin.from("notification_preferences").select("*").eq("user_id", document.owner_id).is("task_id", null).maybeSingle(),
    ]);
    if (!bike || !profile || !preferences) continue;
    const event = dueDocumentEvent(document.expiry_date, today, preferences.overdue_every_days);
    if (!event) continue;
    const name = bike.name || `${bike.manufacturer} ${bike.model}`;
    const channels: Array<["email" | "telegram", string]> = [];
    if (preferences.email_enabled && profile.email) channels.push(["email", profile.email]);
    if (preferences.telegram_enabled && profile.telegram_chat_id) channels.push(["telegram", profile.telegram_chat_id]);
    for (const [channel, recipient] of channels) {
      const result = await deliver({ admin, ownerId: document.owner_id, entityId: document.id, bikeId: document.bike_id, documentId: document.id, version: document.expiry_date, event, channel, recipient, bike: name, task: `${document.document_type.toUpperCase()} expiry: ${document.title}`, odometer: Number(bike.current_odometer ?? 0), estimatedCost: null });
      if (result === "sent") summary.sent += 1;
      else if (result === "failed" || result === "log-error") summary.failed += 1;
      else summary.skipped += 1;
    }
  }

  const { data: bikes, error: bikeError } = await admin.from("bikes").select("id,owner_id,name,manufacturer,model,current_odometer,insurance_expiry,puc_expiry").or("insurance_expiry.not.is.null,puc_expiry.not.is.null");
  if (bikeError) throw new Error("Unable to load bike expiry dates for reminders.");
  for (const bike of bikes ?? []) {
    for (const [field, documentLabel] of [["insurance_expiry", "Insurance"], ["puc_expiry", "PUC"]] as const) {
      const expiryDate = bike[field];
      if (!expiryDate) continue;
      const [{ data: profile }, { data: preference }] = await Promise.all([
        admin.from("profiles").select("email,telegram_chat_id").eq("id", bike.owner_id).maybeSingle(),
        admin.from("notification_preferences").select("*").eq("user_id", bike.owner_id).is("task_id", null).maybeSingle(),
      ]);
      if (!profile || !preference) continue;
      const event = dueDocumentEvent(expiryDate, today, preference.overdue_every_days);
      if (!event) continue;
      const bikeName = bike.name || `${bike.manufacturer} ${bike.model}`;
      const channels: Array<["email" | "telegram", string]> = [];
      if (preference.email_enabled && profile.email) channels.push(["email", profile.email]);
      if (preference.telegram_enabled && profile.telegram_chat_id) channels.push(["telegram", profile.telegram_chat_id]);
      for (const [channel, recipient] of channels) {
        const result = await deliver({ admin, ownerId: bike.owner_id, entityId: `${bike.id}:${field}`, bikeId: bike.id, version: expiryDate, event, channel, recipient, bike: bikeName, task: `${documentLabel} expiry`, odometer: Number(bike.current_odometer ?? 0), estimatedCost: null, bikeExpiryField: field });
        if (result === "sent") summary.sent += 1;
        else if (result === "failed" || result === "log-error") summary.failed += 1;
        else summary.skipped += 1;
      }
    }
  }
  return summary;
}