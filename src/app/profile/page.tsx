import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { BikeProfileForm } from "@/components/bike-profile-form";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ProfileContent() {
  let bike: Record<string, unknown> | undefined;
  let setupMessage = "";

  if (!hasSupabaseConfiguration()) {
    setupMessage = "Add your Supabase project URL and anon key to .env.local, then apply the migration before saving records.";
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("bikes").select("*").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
      bike = data ?? undefined;
    }
  }

  return (
    <>
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-xs text-[#929990] hover:text-[#f0f2ed]"><ArrowLeft size={14} /> Back to overview</Link>
      <SectionHeading eyebrow="Garage profile" title={bike ? "Bike profile" : "Add your motorcycle"} detail="Keep the details and documents that make this bike yours." />
      {setupMessage && <p className="mb-4 rounded-md border border-[#6b542c] bg-[#2b2418] px-4 py-3 text-xs leading-5 text-[#f3c879]">{setupMessage}</p>}
      <BikeProfileForm bike={bike} />
    </>
  );
}

export default function BikeProfilePage() {
  return <AppShell><Suspense fallback={<div className="h-80 animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><ProfileContent /></Suspense></AppShell>;
}