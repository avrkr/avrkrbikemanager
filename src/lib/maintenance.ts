export type MaintenanceStatus = "upcoming" | "due" | "overdue" | "completed";

export function getMaintenanceStatus(task: {
  status?: string | null;
  next_due_date?: string | null;
  next_due_odometer?: number | null;
}, currentOdometer: number, now = new Date()): MaintenanceStatus {
  if (task.status === "completed") return "completed";

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueAt = task.next_due_date ? Date.parse(`${task.next_due_date}T00:00:00Z`) : null;
  const remainingKm = task.next_due_odometer === null || task.next_due_odometer === undefined
    ? null
    : task.next_due_odometer - currentOdometer;

  if ((dueAt !== null && dueAt < today) || (remainingKm !== null && remainingKm < 0)) return "overdue";
  if ((dueAt !== null && dueAt <= today) || (remainingKm !== null && remainingKm <= 200)) return "due";
  return "upcoming";
}

export function addDaysToDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function dateInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}