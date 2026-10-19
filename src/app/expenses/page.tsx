import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Fuel, Gauge, IndianRupee, Wrench } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { ExpenseForm, FuelForm, OdometerForm } from "@/components/expense-forms";
import { ExpensesChart } from "@/components/expenses-chart";
import { hasSupabaseConfiguration } from "@/lib/env";
import { dateInIndia } from "@/lib/maintenance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const currency = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

async function ExpensesContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs leading-5 text-[#f3c879]">Configure Supabase and apply the migration to track costs and odometer readings.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: bikes } = await supabase.from("bikes").select("id,name,manufacturer,model,current_odometer").eq("owner_id", user.id).order("created_at");
  const bike = bikes?.[0];
  if (!bike) return <section className="rounded-md border border-[#303630] bg-[#191c19] p-6 text-center"><Gauge className="mx-auto text-[#d8fa56]" size={22} /><h2 className="mt-3 text-sm font-semibold">Add your motorcycle first</h2><p className="mt-1 text-xs text-[#929990]">Fuel stops, costs, and odometer readings are kept per bike.</p><Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d8fa56]">Set up your bike <ArrowUpRight size={13} /></Link></section>;

  const [{ data: expenses }, { data: fuelLogs }, { data: odometerLogs }] = await Promise.all([
    supabase.from("expenses").select("id,expense_date,category,description,amount,odometer").eq("owner_id", user.id).eq("bike_id", bike.id).order("expense_date", { ascending: false }),
    supabase.from("fuel_logs").select("id,refuelled_at,odometer,litres,price_per_litre,total_amount,fuel_station,full_tank").eq("owner_id", user.id).eq("bike_id", bike.id).order("odometer", { ascending: true }),
    supabase.from("odometer_logs").select("id,recorded_at,odometer,source,correction_reason,notes").eq("owner_id", user.id).eq("bike_id", bike.id).order("recorded_at", { ascending: false }).limit(30),
  ]);
  const today = dateInIndia();
  const thisYear = today.slice(0, 4);
  const annualExpenses = (expenses ?? []).filter((item) => item.expense_date.startsWith(thisYear));
  const annualTotal = annualExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const annualFuel = annualExpenses.filter((item) => item.category === "fuel").reduce((sum, item) => sum + Number(item.amount), 0);
  const annualMaintenance = annualExpenses.filter((item) => item.category === "maintenance").reduce((sum, item) => sum + Number(item.amount), 0);
  const readings = [...(odometerLogs ?? [])].reverse();
  const travelled = readings.length > 1 ? Math.max(0, readings[readings.length - 1].odometer - readings[0].odometer) : 0;
  const costPerKm = travelled > 0 ? annualTotal / travelled : null;
  const fullTanks = (fuelLogs ?? []).filter((log) => log.full_tank);
  const efficiencyValues = fullTanks.slice(1).flatMap((current, index) => {
    const previous = fullTanks[index];
    const distance = Number(current.odometer) - Number(previous.odometer);
    return distance > 0 && Number(current.litres) > 0 ? [distance / Number(current.litres)] : [];
  });
  const averageEfficiency = efficiencyValues.length ? efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length : null;

  const monthData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    const monthly = (expenses ?? []).filter((item) => item.expense_date.startsWith(key));
    const total = (category: string) => monthly.filter((item) => category === "other" ? !["fuel", "maintenance"].includes(item.category) : item.category === category).reduce((sum, item) => sum + Number(item.amount), 0);
    return { month: date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }), fuel: total("fuel"), maintenance: total("maintenance"), other: total("other") };
  });

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Spending this year</p><p className="mt-2 text-xl font-semibold">{currency(annualTotal)}</p></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Service costs</p><p className="mt-2 text-xl font-semibold">{currency(annualMaintenance)}</p></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Fuel costs</p><p className="mt-2 text-xl font-semibold">{currency(annualFuel)}</p></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Full-tank efficiency</p><p className="mt-2 text-xl font-semibold">{averageEfficiency ? `${averageEfficiency.toFixed(1)} km/L` : "--"}</p></section>
      </div>
      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Monthly spending</h2><p className="mt-1 text-xs text-[#929990]">Last six months · all recorded categories</p></div><ExpensesChart data={monthData} /></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5"><h2 className="text-sm font-semibold">Cost per kilometre</h2><p className="mt-1 text-xs text-[#929990]">Annual costs divided by recorded distance.</p><p className="mt-5 text-3xl font-semibold">{costPerKm === null ? "--" : `${currency(costPerKm)}/km`}</p><p className="mt-1 text-[11px] text-[#7f877e]">{travelled > 0 ? `${travelled.toLocaleString("en-IN")} km between logged readings` : "Add at least two odometer readings to calculate."}</p><div className="mt-5 border-t border-[#303630] pt-4"><p className="text-[11px] text-[#929990]">Current odometer</p><p className="mt-1 flex items-center gap-2 text-lg font-semibold"><Gauge size={16} className="text-[#d8fa56]" />{Number(bike.current_odometer).toLocaleString("en-IN")} km</p></div></section>
      </div>
      <div className="mb-5 grid gap-5 xl:grid-cols-2"><FuelForm bikeId={bike.id} today={today} /><ExpenseForm bikeId={bike.id} today={today} /></div>
      <section className="mb-5 overflow-hidden rounded-md border border-[#303630] bg-[#191c19]">
        <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Recent expenses</h2><p className="mt-1 text-xs text-[#929990]">Fuel and service entries are included automatically.</p></div>
        {expenses?.length ? <div className="divide-y divide-[#303630]">{expenses.slice(0, 12).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#252b22] text-[#a8bd64]">{item.category === "fuel" ? <Fuel size={15} /> : item.category === "maintenance" ? <Wrench size={15} /> : <IndianRupee size={15} />}</span><div className="min-w-0"><p className="truncate text-xs font-medium">{item.description}</p><p className="mt-0.5 text-[10px] capitalize text-[#929990]">{item.category} · {new Date(`${item.expense_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</p></div></div><p className="text-sm font-semibold">{currency(Number(item.amount))}</p></div>)}</div> : <div className="px-5 py-8 text-center text-xs text-[#929990]">No expenses logged yet.</div>}
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <OdometerForm bikeId={bike.id} />
        <section className="overflow-hidden rounded-md border border-[#303630] bg-[#191c19]"><div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Odometer history</h2><p className="mt-1 text-xs text-[#929990]">Manual readings and service/fuel updates.</p></div>{odometerLogs?.length ? <div className="max-h-[320px] divide-y divide-[#303630] overflow-y-auto">{odometerLogs.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"><div><p className="text-xs font-medium">{Number(entry.odometer).toLocaleString("en-IN")} km <span className="ml-1 font-normal capitalize text-[#929990]">· {entry.source}</span></p>{entry.correction_reason && <p className="mt-1 text-[10px] text-[#f3c879]">Correction: {entry.correction_reason}</p>}{entry.notes && <p className="mt-1 text-[10px] text-[#7f877e]">{entry.notes}</p>}</div><time className="shrink-0 text-[10px] text-[#7f877e]">{new Date(entry.recorded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></div>)}</div> : <div className="px-5 py-8 text-center text-xs text-[#929990]">Your odometer entries will appear here.</div>}</section>
      </div>
      <p className="mt-5 text-[10px] text-[#737b71]">Fuel efficiency is estimated only from successive full-tank entries; incomplete entries are excluded.</p>
    </>
  );
}

export default function ExpensesPage() {
  return <AppShell><SectionHeading eyebrow="Running costs" title="Fuel & expenses" detail="See where the kilometres and costs are going." action={<Link href="/services" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#394039] px-3 text-xs text-[#d0d5cc] hover:bg-white/[0.04]"><Wrench size={15} /> Service history</Link>} /><Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><ExpensesContent /></Suspense></AppShell>;
}