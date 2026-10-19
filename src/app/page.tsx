import { Suspense } from "react";
import Link from "next/link";
import { CirclePlus } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";
import { DashboardData } from "@/components/dashboard-data";

export default function Dashboard() {
  return <AppShell>
    <SectionHeading eyebrow="Garage overview" title="Your garage" detail="A clear view of what your bike needs, and when." action={<Link href="/profile" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] transition-colors hover:bg-[#e4ff79]"><CirclePlus size={16} aria-hidden="true" /> Add motorcycle</Link>} />
    <Suspense fallback={<div className="h-[680px] animate-pulse rounded-md border border-[#303630] bg-[#191c19]" />}><DashboardData /></Suspense>
  </AppShell>;
}