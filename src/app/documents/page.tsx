import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, CalendarClock, FileText, ShieldCheck } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { DocumentControls, DocumentUploadForm } from "@/components/document-controls";
import { hasSupabaseConfiguration } from "@/lib/env";
import { dateInIndia } from "@/lib/maintenance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function DocumentsContent() {
  if (!hasSupabaseConfiguration()) return <p className="rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs text-[#f3c879]">Configure Supabase and apply the storage migration to manage private documents.</p>;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: bikes } = await supabase.from("bikes").select("id,name,manufacturer,model").eq("owner_id", user.id).order("created_at");
  const bike = bikes?.[0];
  if (!bike) return <section className="rounded-md border border-[#303630] bg-[#191c19] p-6 text-center"><FileText className="mx-auto text-[#d8fa56]" size={22} /><h2 className="mt-3 text-sm font-semibold">Add your motorcycle first</h2><p className="mt-1 text-xs text-[#929990]">Documents are organized with the motorcycle they belong to.</p><Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d8fa56]">Set up your bike <ArrowUpRight size={13} /></Link></section>;
  const [{ data: documents }, { data: services }] = await Promise.all([
    supabase.from("documents").select("id,document_type,title,file_name,size_bytes,expiry_date,uploaded_at").eq("owner_id", user.id).eq("bike_id", bike.id).order("uploaded_at", { ascending: false }),
    supabase.from("service_records").select("id,service_date,workshop").eq("owner_id", user.id).eq("bike_id", bike.id).order("service_date", { ascending: false }).limit(100),
  ]);
  const today = dateInIndia();
  const expiryStatus = (expiryDate: string) => {
    const days = Math.round((Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: "text-[#ff958b]" };
    if (days <= 30) return { label: days === 0 ? "Expires today" : `Expires in ${days}d`, color: "text-[#f3c879]" };
    return { label: `Expires ${new Date(`${expiryDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`, color: "text-[#a3aaa1]" };
  };

  return <>
    <div className="mb-5 flex items-start gap-3 rounded-md border border-[#46513a] bg-[#1c211a] p-4"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#d8fa56]" /><p className="text-xs leading-5 text-[#b7c0ad]">Files are stored in a private Supabase bucket. Downloads use short-lived links after ownership is verified.</p></div>
    <div className="mb-5"><DocumentUploadForm bikeId={bike.id} today={today} services={services ?? []} /></div>
    <section className="overflow-hidden rounded-md border border-[#303630] bg-[#191c19]">
      <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Documents</h2><p className="mt-1 text-xs text-[#929990]">{bike.name || `${bike.manufacturer} ${bike.model}`} · {documents?.length ?? 0} files</p></div>
      {documents?.length ? <div className="divide-y divide-[#303630]">{documents.map((document) => <article key={document.id} className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#252b22] text-[#a8bd64]"><FileText size={17} /></span><div className="min-w-0"><h3 className="truncate text-xs font-medium">{document.title}</h3><p className="mt-1 truncate text-[10px] text-[#929990]">{document.file_name} · {(document.size_bytes / 1024 / 1024).toFixed(1)} MB · {document.document_type}</p>{document.expiry_date && <p className={`mt-1 inline-flex items-center gap-1 text-[10px] ${expiryStatus(document.expiry_date).color}`}><CalendarClock size={11} />{expiryStatus(document.expiry_date).label}</p>}</div></div><DocumentControls id={document.id} /></article>)}</div> : <div className="px-5 py-9 text-center"><FileText className="mx-auto text-[#a8bd64]" size={22} /><p className="mt-3 text-sm font-medium">No documents stored</p><p className="mt-1 text-xs text-[#929990]">Add registration, insurance, PUC, warranty, or invoice files.</p></div>}
    </section>
  </>;
}

export default function DocumentsPage() {
  return <AppShell><SectionHeading eyebrow="Private records" title="Documents" detail="Keep registration, insurance, receipts, and service paperwork close." /><Suspense fallback={<div className="h-80 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><DocumentsContent /></Suspense></AppShell>;
}