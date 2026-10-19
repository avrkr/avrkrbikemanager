import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gauge, ShieldCheck, Wrench } from "lucide-react";
import { hasSupabaseConfiguration } from "@/lib/env";
import { dateInIndia, getMaintenanceStatus } from "@/lib/maintenance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const currency = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function Metric({ label, value, unit, note, icon: Icon }: { label: string; value: string; unit?: string; note: string; icon: typeof Gauge }) {
  return <section className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#a2aaa0]">{label}</p><Icon size={16} strokeWidth={1.7} className="text-[#a8bd64]" /></div><div className="mt-5 flex items-baseline gap-2"><span className="text-[28px] font-semibold tracking-[-0.03em]">{value}</span>{unit && <span className="text-xs text-[#929990]">{unit}</span>}</div><p className="mt-1 text-[11px] text-[#7f877e]">{note}</p></section>;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Wrench; label: string }) {
  return <Link href={href} className="flex min-h-11 items-center gap-3 rounded-md border border-[#303630] bg-[#191c19] px-3 text-xs font-medium text-[#d0d5cc] transition-colors hover:border-[#546047] hover:bg-[#202420]"><Icon size={15} className="text-[#d8fa56]" />{label}<ArrowUpRight size={14} className="ml-auto text-[#737b71]" /></Link>;
}

export async function DashboardData() {
  if (!hasSupabaseConfiguration()) return <>
    <section className="relative isolate mb-5 overflow-hidden rounded-md border border-[#394133] bg-[#1a1e19]"><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#161a16_0%,rgb(22_26_22_/_0.97)_38%,rgb(22_26_22_/_0.3)_100%),url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center opacity-85" /><div className="flex min-h-[250px] flex-col justify-between gap-8 p-5 sm:flex-row sm:items-end sm:p-8"><div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-sm border border-[#d8fa56]/25 bg-[#111311]/65 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8fa56]"><span className="size-1.5 rounded-full bg-[#d8fa56]" /> Setup required</span><h2 className="mt-5 text-2xl font-semibold sm:text-[30px]">Your next ride starts here.</h2><p className="mt-2 text-sm leading-6 text-[#bdc3ba]">Configure Supabase and add your motorcycle to start a private maintenance log.</p></div><Link href="/profile" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811]">Set up your bike <ArrowUpRight size={15} /></Link></div></section>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Odometer" value="--" unit="km" note="Add a current reading" icon={Gauge} /><Metric label="Next service" value="--" note="No schedule yet" icon={Wrench} /><Metric label="This year" value="₹0" note="No costs recorded" icon={ArrowUpRight} /><Metric label="Fuel efficiency" value="--" unit="km/L" note="Log two full tanks to begin" icon={ShieldCheck} /></div>
  </>;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const today = dateInIndia();
  const { data: bikes } = await supabase.from("bikes").select("id,name,manufacturer,model,current_odometer").eq("owner_id", user.id).order("created_at");
  const bike = bikes?.[0];
  if (!bike) return <>
    <section className="relative isolate mb-5 overflow-hidden rounded-md border border-[#394133] bg-[#1a1e19]"><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#161a16_0%,rgb(22_26_22_/_0.97)_38%,rgb(22_26_22_/_0.3)_100%),url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center opacity-85" /><div className="flex min-h-[250px] flex-col justify-between gap-8 p-5 sm:flex-row sm:items-end sm:p-8"><div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-sm border border-[#d8fa56]/25 bg-[#111311]/65 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8fa56]">Garage setup</span><h2 className="mt-5 text-2xl font-semibold sm:text-[30px]">Your next ride starts here.</h2><p className="mt-2 text-sm leading-6 text-[#bdc3ba]">Add a motorcycle to build a maintenance plan around its own history and intervals.</p></div><Link href="/profile" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811]">Add motorcycle <ArrowUpRight size={15} /></Link></div></section>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Odometer" value="--" unit="km" note="Add a current reading" icon={Gauge} /><Metric label="Next service" value="--" note="No schedule yet" icon={Wrench} /><Metric label="This year" value="₹0" note="No costs recorded" icon={ArrowUpRight} /><Metric label="Fuel efficiency" value="--" unit="km/L" note="Log two full tanks to begin" icon={ShieldCheck} /></div>
  </>;

  const [{ data: tasks }, { data: expenses }, { data: fuels }, { data: records }] = await Promise.all([
    supabase.from("maintenance_tasks").select("id,name,category,priority,next_due_date,next_due_odometer,status").eq("owner_id", user.id).eq("bike_id", bike.id).eq("is_active", true),
    supabase.from("expenses").select("expense_date,amount,category").eq("owner_id", user.id).eq("bike_id", bike.id),
    supabase.from("fuel_logs").select("odometer,litres,full_tank").eq("owner_id", user.id).eq("bike_id", bike.id).eq("full_tank", true).order("odometer"),
    supabase.from("service_records").select("id,service_date,odometer,total_cost,work_performed,workshop").eq("owner_id", user.id).eq("bike_id", bike.id).order("service_date", { ascending: false }).limit(4),
  ]);
  const activeTasks = tasks ?? [];
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const priority = { overdue: 0, due: 1, upcoming: 2, completed: 3 };
    const aStatus = getMaintenanceStatus(a, bike.current_odometer ?? 0);
    const bStatus = getMaintenanceStatus(b, bike.current_odometer ?? 0);
    return priority[aStatus] - priority[bStatus];
  });
  const nextTask = sortedTasks[0];
  const yearExpenses = (expenses ?? []).filter((item) => item.expense_date.startsWith(today.slice(0, 4)));
  const annualSpend = yearExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const fullTanks = fuels ?? [];
  const efficiency = fullTanks.length > 1
    ? (Number(fullTanks[fullTanks.length - 1].odometer) - Number(fullTanks[0].odometer)) / fullTanks.slice(1).reduce((sum, fill) => sum + Number(fill.litres), 0)
    : null;
  const taskStatus = nextTask ? getMaintenanceStatus(nextTask, bike.current_odometer ?? 0) : null;
  const statusColors = { overdue: "text-[#ff958b]", due: "text-[#f3c879]", upcoming: "text-[#c3d98c]", completed: "text-[#91c5a4]" };
  const bikeName = bike.name || `${bike.manufacturer} ${bike.model}`;
  const [calendarYear, calendarMonth] = today.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate();
  const calendarCells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const dueByDate = new Map<string, string[]>();
  for (const task of activeTasks) {
    if (!task.next_due_date) continue;
    const dueTasks = dueByDate.get(task.next_due_date) ?? [];
    dueTasks.push(task.name);
    dueByDate.set(task.next_due_date, dueTasks);
  }

  return <>
    <section aria-label="Motorcycle profile" className="relative isolate mb-5 overflow-hidden rounded-md border border-[#394133] bg-[#1a1e19]"><div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#161a16_0%,rgb(22_26_22_/_0.97)_38%,rgb(22_26_22_/_0.3)_100%),url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center opacity-85" /><div className="flex min-h-[250px] flex-col justify-between gap-8 p-5 sm:flex-row sm:items-end sm:p-8"><div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-sm border border-[#d8fa56]/25 bg-[#111311]/65 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8fa56]"><span className="size-1.5 rounded-full bg-[#d8fa56]" /> Garage active</span><h2 className="mt-5 text-2xl font-semibold sm:text-[30px]">{bikeName}</h2><p className="mt-2 text-sm leading-6 text-[#bdc3ba]">{bike.current_odometer.toLocaleString("en-IN")} km on the clock. Your history stays tied to this bike.</p></div><Link href="/profile" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-[#59654b] bg-[#111311]/55 px-4 text-xs font-semibold hover:bg-[#111311]/85">Edit bike profile <ArrowUpRight size={15} /></Link></div></section>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: "Odometer", value: Number(bike.current_odometer).toLocaleString("en-IN"), unit: "km", note: "Manual reading", icon: Gauge },
      { label: "Next maintenance", value: nextTask ? (taskStatus === "overdue" ? "Overdue" : taskStatus === "due" ? "Due" : nextTask.next_due_date ? new Date(`${nextTask.next_due_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : `${Number(nextTask.next_due_odometer).toLocaleString("en-IN")} km`) : "--", note: nextTask?.name ?? "No active schedule", icon: Wrench },
      { label: "This year", value: currency(annualSpend), note: `${yearExpenses.length} expense entries`, icon: ArrowUpRight },
      { label: "Fuel efficiency", value: efficiency && Number.isFinite(efficiency) ? efficiency.toFixed(1) : "--", unit: "km/L", note: efficiency ? "From full-tank entries" : "Log two full tanks to begin", icon: ShieldCheck },
    ].map((metric) => <Metric key={metric.label} {...metric} />)}</div>

    <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,0.8fr)]">
      <section className="rounded-md border border-[#303630] bg-[#191c19]"><div className="flex items-center justify-between border-b border-[#303630] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold">Maintenance schedule</h2><p className="mt-1 text-xs text-[#929990]">{activeTasks.length ? `${activeTasks.length} active task${activeTasks.length === 1 ? "" : "s"}` : "Keep routine work from catching you off guard."}</p></div><Link href="/maintenance" className="inline-flex items-center gap-1 text-xs font-medium text-[#d8fa56]">View schedule <ArrowUpRight size={13} /></Link></div>
        {sortedTasks.length ? <div className="divide-y divide-[#303630]">{sortedTasks.slice(0, 5).map((task) => { const status = getMaintenanceStatus(task, bike.current_odometer ?? 0); return <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"><div><p className="text-xs font-medium">{task.name}</p><p className="mt-1 text-[10px] text-[#929990]">{task.category} · {task.priority}</p></div><div className="flex items-center gap-3"><span className={`text-[10px] font-semibold uppercase ${statusColors[status]}`}>{status}</span><span className="max-w-32 text-right text-[10px] text-[#929990]">{task.next_due_date ? new Date(`${task.next_due_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : task.next_due_odometer ? `${Number(task.next_due_odometer).toLocaleString("en-IN")} km` : "No due threshold"}</span></div></div>; })}</div> : <div className="px-4 py-7 text-center sm:px-5"><span className="mx-auto grid size-10 place-items-center rounded-md border border-[#3a4037] bg-[#202420] text-[#d8fa56]"><CalendarDays size={18} /></span><h3 className="mt-3 text-sm font-medium">No maintenance tasks yet</h3><p className="mt-1 text-xs text-[#929990]">Set intervals from your manufacturer service manual.</p><Link href="/maintenance" className="mt-3 inline-block text-xs font-semibold text-[#d8fa56]">Create a task <span aria-hidden="true">-&gt;</span></Link></div>}
      </section>
      <section className="rounded-md border border-[#303630] bg-[#191c19]"><div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Quick actions</h2><p className="mt-1 text-xs text-[#929990]">Keep the essentials close.</p></div><div className="grid gap-2 p-4 sm:p-5"><QuickAction href="/services" icon={Wrench} label="Record a service" /><QuickAction href="/expenses" icon={Gauge} label="Update odometer" /><QuickAction href="/documents" icon={ShieldCheck} label="Add a document" /></div></section>
    </div>
    <section className="mt-5 rounded-md border border-[#303630] bg-[#191c19]">
      <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Maintenance calendar</h2><p className="mt-1 text-xs text-[#929990]">{new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })} · dates with markers have scheduled work.</p></div>
      <div className="grid grid-cols-7 gap-px p-3 sm:p-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => <span key={weekday} className="pb-2 text-center text-[9px] font-semibold uppercase text-[#737b71]">{weekday}</span>)}
        {calendarCells.map((day, index) => {
          const date = day === null ? "" : `${today.slice(0, 7)}-${String(day).padStart(2, "0")}`;
          const dueTasks = date ? dueByDate.get(date) ?? [] : [];
          const isToday = date === today;
          return <div key={`${date || "blank"}-${index}`} title={dueTasks.join(", ")} aria-label={day === null ? undefined : `${date}${dueTasks.length ? `: ${dueTasks.join(", ")}` : ""}`} className={`flex min-h-[42px] flex-col items-center justify-center rounded-sm text-[11px] ${day === null ? "" : isToday ? "bg-[#252b22] font-semibold text-[#d8fa56]" : "text-[#a3aaa1]"}`}>
            {day}
            {dueTasks.length > 0 && <span className="mt-1 flex gap-0.5" aria-hidden="true">{dueTasks.slice(0, 3).map((task, taskIndex) => <span key={`${task}-${taskIndex}`} className="size-1 rounded-full bg-[#d8fa56]" />)}</span>}
          </div>;
        })}
      </div>
      <p className="px-4 pb-4 text-[10px] text-[#7f877e]">Date intervals only. Mileage thresholds remain visible in the schedule list.</p>
    </section>
    <section className="mt-5 rounded-md border border-[#303630] bg-[#191c19]"><div className="flex items-center justify-between border-b border-[#303630] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold">Recent service history</h2><p className="mt-1 text-xs text-[#929990]">Recent work and recorded cost.</p></div><Link href="/services" className="text-xs font-medium text-[#d8fa56]">All services <ArrowUpRight className="ml-1 inline" size={13} /></Link></div>{records?.length ? <div className="divide-y divide-[#303630]">{records.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"><div><p className="text-xs font-medium">{record.work_performed || "Service visit"}</p><p className="mt-1 text-[10px] text-[#929990]">{new Date(`${record.service_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · {Number(record.odometer).toLocaleString("en-IN")} km · {record.workshop || "Workshop not recorded"}</p></div><p className="text-xs font-semibold">{currency(Number(record.total_cost))}</p></div>)}</div> : <div className="px-5 py-6 text-center text-xs text-[#929990]">Completed service records will appear here.</div>}</section>
    <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#272c27] pt-4 text-[10px] text-[#737b71] sm:flex-row"><span>Manual odometer entry. No GPS or vehicle sensor connection.</span><span>Intervals are yours to set; generic defaults are estimates.</span></footer>
  </>;
}