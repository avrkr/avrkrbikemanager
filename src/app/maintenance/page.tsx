import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, CalendarClock, CirclePlus, Gauge, Wrench } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { MaintenanceForm } from "@/components/maintenance-form";
import { MaintenanceTaskControls } from "@/components/maintenance-task-controls";
import { TaskNotificationForm } from "@/components/notification-settings-form";
import { hasSupabaseConfiguration } from "@/lib/env";
import { getMaintenanceStatus } from "@/lib/maintenance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusStyle = {
  overdue: "border-[#74413b] bg-[#331f1c] text-[#ff958b]",
  due: "border-[#70552e] bg-[#302817] text-[#f3c879]",
  upcoming: "border-[#46513a] bg-[#242a20] text-[#c3d98c]",
  completed: "border-[#3b4d45] bg-[#1c2823] text-[#91c5a4]",
};

async function MaintenanceContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs leading-5 text-[#f3c879]">Configure Supabase and apply the migration to manage schedules.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: bikes } = await supabase.from("bikes").select("id,name,manufacturer,model,current_odometer").eq("owner_id", user.id).order("created_at");
  const bike = bikes?.[0];
  if (!bike) return <section className="rounded-md border border-[#303630] bg-[#191c19] p-6 text-center"><Wrench className="mx-auto text-[#d8fa56]" size={22} /><h2 className="mt-3 text-sm font-semibold">Add a bike to begin</h2><p className="mt-1 text-xs text-[#929990]">Maintenance schedules belong to a specific motorcycle.</p><Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d8fa56]">Add motorcycle <ArrowUpRight size={13} /></Link></section>;

  const [{ data: tasks }, { data: types }, { data: preferences }] = await Promise.all([
    supabase.from("maintenance_tasks").select("*").eq("owner_id", user.id).eq("bike_id", bike.id).eq("is_active", true).order("next_due_date", { ascending: true, nullsFirst: false }),
    supabase.from("maintenance_types").select("id,name,category,guidance_note").order("category").order("name"),
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).not("task_id", "is", null),
  ]);

  return (
    <>
      <section className="mb-5 flex flex-col justify-between gap-2 rounded-md border border-[#303630] bg-[#191c19] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <p className="text-xs text-[#c7ccc5]"><span className="font-medium">{bike.name || `${bike.manufacturer} ${bike.model}`}</span> · {(bike.current_odometer ?? 0).toLocaleString("en-IN")} km</p>
        <p className="text-[11px] text-[#929990]">Intervals are estimates; check the model-specific service manual.</p>
      </section>
      {tasks?.length ? <section className="mb-5 overflow-hidden rounded-md border border-[#303630] bg-[#191c19]">
        <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Active schedule</h2><p className="mt-1 text-xs text-[#929990]">{tasks.length} maintenance {tasks.length === 1 ? "task" : "tasks"}</p></div>
        <div className="divide-y divide-[#303630]">
          {tasks.map((task) => {
            const status = getMaintenanceStatus(task, bike.current_odometer ?? 0);
            return <article key={task.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium">{task.name}</h3><span className={`rounded-sm border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${statusStyle[status]}`}>{status}</span></div><p className="mt-1 text-xs text-[#929990]">{task.category} · {task.priority} priority</p></div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#a3aaa1]">
                {task.next_due_date && <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> Due {new Date(`${task.next_due_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span>}
                {task.next_due_odometer !== null && <span className="inline-flex items-center gap-1.5"><Gauge size={13} /> {Number(task.next_due_odometer).toLocaleString("en-IN")} km</span>}
                {task.estimated_cost !== null && <span>Est. ₹{Number(task.estimated_cost).toLocaleString("en-IN")}</span>}
              </div>
              <div className="sm:col-span-2"><MaintenanceTaskControls task={task} /></div>
              <div className="sm:col-span-2"><TaskNotificationForm taskId={task.id} settings={preferences?.find((item) => item.task_id === task.id)} /></div>
            </article>;
          })}
        </div>
      </section> : <section className="mb-5 rounded-md border border-dashed border-[#3b4338] bg-[#171a17] px-5 py-7 text-center"><CirclePlus className="mx-auto text-[#a8bd64]" size={22} /><h2 className="mt-3 text-sm font-medium">Your maintenance plan starts here</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#929990]">Add model-specific intervals from your service manual, or create a personal schedule. Generic built-in categories are only estimates.</p></section>}
      <MaintenanceForm bikeId={bike.id} types={types ?? []} />
    </>
  );
}

export default function MaintenancePage() {
  return <AppShell><SectionHeading eyebrow="Preventive care" title="Maintenance" detail="Build a schedule that fits your motorcycle and your riding." action={<Link href="/profile" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#394039] px-3 text-xs text-[#d0d5cc] hover:bg-white/[0.04]"><Wrench size={15} /> Bike profile</Link>} /><Suspense fallback={<div className="h-72 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><MaintenanceContent /></Suspense></AppShell>;
}