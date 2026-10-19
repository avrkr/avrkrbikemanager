import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, CalendarDays, ClipboardList, Gauge, Wrench } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { ServiceForm } from "@/components/service-form";
import { ServiceRecordActions } from "@/components/service-record-actions";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ServicesContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs leading-5 text-[#f3c879]">Configure Supabase and apply the migration to save service records.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: bikes } = await supabase.from("bikes").select("id,name,manufacturer,model,current_odometer").eq("owner_id", user.id).order("created_at");
  const bike = bikes?.[0];
  if (!bike) return <section className="rounded-md border border-[#303630] bg-[#191c19] p-6 text-center"><ClipboardList className="mx-auto text-[#d8fa56]" size={22} /><h2 className="mt-3 text-sm font-semibold">Add your motorcycle first</h2><p className="mt-1 text-xs text-[#929990]">Service records are kept with the bike they belong to.</p><Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d8fa56]">Set up your bike <ArrowUpRight size={13} /></Link></section>;

  const [{ data: records }, { data: tasks }, { data: invoices }] = await Promise.all([
    supabase.from("service_records").select("*").eq("owner_id", user.id).eq("bike_id", bike.id).order("service_date", { ascending: false }),
    supabase.from("maintenance_tasks").select("id,name,category").eq("owner_id", user.id).eq("bike_id", bike.id).eq("is_active", true).order("name"),
    supabase.from("documents").select("id,title,service_record_id").eq("owner_id", user.id).eq("bike_id", bike.id).not("service_record_id", "is", null),
  ]);
  const totalSpend = (records ?? []).reduce((total, record) => total + Number(record.total_cost ?? 0), 0);

  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-3">
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Service visits</p><p className="mt-2 text-xl font-semibold">{records?.length ?? 0}</p></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Recorded spend</p><p className="mt-2 truncate text-xl font-semibold">₹{totalSpend.toLocaleString("en-IN")}</p></section>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-4"><p className="text-[11px] text-[#929990]">Current odometer</p><p className="mt-2 truncate text-xl font-semibold">{Number(bike.current_odometer ?? 0).toLocaleString("en-IN")} <span className="text-xs font-normal text-[#929990]">km</span></p></section>
      </div>
      <div className="mb-5"><ServiceForm bikeId={bike.id} tasks={tasks ?? []} /></div>
      <section className="overflow-hidden rounded-md border border-[#303630] bg-[#191c19]">
        <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Service history</h2><p className="mt-1 text-xs text-[#929990]">{bike.name || `${bike.manufacturer} ${bike.model}`}</p></div>
        {records?.length ? <div className="divide-y divide-[#303630]">{records.map((record) => <article key={record.id} className="px-4 py-4 sm:px-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="text-sm font-medium">{record.work_performed || record.parts_replaced || "Service visit"}</h3><span className="text-sm font-semibold text-[#d8fa56]">₹{Number(record.total_cost).toLocaleString("en-IN")}</span></div><p className="mt-1.5 text-xs text-[#929990]">{record.workshop || "Workshop not recorded"}{record.mechanic ? ` · ${record.mechanic}` : ""}</p></div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#a3aaa1]"><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{new Date(`${record.service_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span><span className="inline-flex items-center gap-1.5"><Gauge size={13} />{Number(record.odometer).toLocaleString("en-IN")} km</span></div>
          </div>
          {record.oil_brand && <p className="mt-2 text-xs text-[#929990]">{record.oil_brand}{record.oil_grade ? ` · ${record.oil_grade}` : ""}{record.oil_quantity_litres ? ` · ${record.oil_quantity_litres} L` : ""}</p>}
          {record.notes && <p className="mt-2 text-xs leading-5 text-[#a3aaa1]">{record.notes}</p>}
          {(invoices ?? []).filter((document) => document.service_record_id === record.id).map((document) => <a key={document.id} href={`/api/documents/${document.id}/download`} target="_blank" rel="noopener noreferrer" className="mt-2 mr-3 inline-block text-[11px] text-[#a8bd64] hover:text-[#d8fa56]">{document.title} ↗</a>)}
          <ServiceRecordActions record={record} />
        </article>)}</div> : <div className="px-5 py-8 text-center"><Wrench className="mx-auto text-[#a8bd64]" size={21} /><p className="mt-3 text-sm font-medium">No services recorded yet</p><p className="mt-1 text-xs text-[#929990]">Your completed work and cost history will appear here.</p></div>}
      </section>
    </>
  );
}

export default function ServicesPage() {
  return <AppShell><SectionHeading eyebrow="Workshop logbook" title="Service history" detail="Keep service dates, odometer readings, and costs in one place." action={<Link href="/maintenance" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#394039] px-3 text-xs text-[#d0d5cc] hover:bg-white/[0.04]"><Wrench size={15} /> Maintenance</Link>} /><Suspense fallback={<div className="h-80 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><ServicesContent /></Suspense></AppShell>;
}