import Link from "next/link";
import { ArrowUpRight, CalendarDays, CirclePlus, Gauge, ShieldCheck, Wrench } from "lucide-react";
import { AppShell, SectionHeading } from "@/components/app-shell";

const metrics = [
  { label: "Odometer", value: "--", unit: "km", icon: Gauge, note: "Add a current reading" },
  { label: "Next service", value: "--", unit: "", icon: Wrench, note: "No schedule yet" },
  { label: "This year", value: "₹0", unit: "", icon: ArrowUpRight, note: "₹0 recorded" },
  { label: "Fuel efficiency", value: "--", unit: "km/L", icon: ShieldCheck, note: "Log two fill-ups to begin" },
];

function MetricCard({ label, value, unit, icon: Icon, note }: (typeof metrics)[number]) {
  return (
    <section className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#a2aaa0]">{label}</p>
        <Icon size={16} strokeWidth={1.7} className="text-[#a8bd64]" aria-hidden="true" />
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tracking-[-0.03em]">{value}</span>
        {unit && <span className="text-xs text-[#929990]">{unit}</span>}
      </div>
      <p className="mt-1 text-[11px] text-[#7f877e]">{note}</p>
    </section>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Wrench; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-3 rounded-md border border-[#303630] bg-[#191c19] px-3 text-xs font-medium text-[#d0d5cc] transition-colors hover:border-[#546047] hover:bg-[#202420]">
      <Icon size={15} className="text-[#d8fa56]" aria-hidden="true" />
      {label}
      <ArrowUpRight size={14} className="ml-auto text-[#737b71]" aria-hidden="true" />
    </Link>
  );
}

export default function Dashboard() {
  return (
    <AppShell>
      <SectionHeading eyebrow="Monday, October 19, 2026" title="Your garage" detail="A clear view of what your bike needs, and when." action={
        <Link href="/profile" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] transition-colors hover:bg-[#e4ff79]">
          <CirclePlus size={16} aria-hidden="true" /> Add motorcycle
        </Link>
      } />

      <section aria-label="Motorcycle profile" className="relative isolate overflow-hidden rounded-md border border-[#394133] bg-[#1a1e19]">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#161a16_0%,rgb(22_26_22_/_0.97)_38%,rgb(22_26_22_/_0.3)_100%),url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=85')] bg-cover bg-center opacity-85" />
        <div className="flex min-h-[252px] flex-col justify-between gap-9 p-5 sm:min-h-[286px] sm:p-8 lg:flex-row lg:items-end">
          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-sm border border-[#d8fa56]/25 bg-[#111311]/65 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8fa56]">
              <span className="size-1.5 rounded-full bg-[#d8fa56]" /> Garage setup
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.025em] sm:text-[30px]">Your next ride starts here.</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#bdc3ba]">Add your motorcycle to build a maintenance plan around its own history and intervals.</p>
          </div>
          <Link href="/profile" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] hover:bg-[#e4ff79]">
            Set up your bike <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,0.8fr)]">
        <section className="rounded-md border border-[#303630] bg-[#191c19]">
          <div className="flex items-center justify-between border-b border-[#303630] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Maintenance schedule</h2>
              <p className="mt-1 text-xs text-[#929990]">Keep routine work from catching you off guard.</p>
            </div>
            <Link href="/maintenance" className="inline-flex items-center gap-1 text-xs font-medium text-[#d8fa56]">View schedule <ArrowUpRight size={13} /></Link>
          </div>
          <div className="px-4 py-6 sm:px-5 sm:py-8">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <span className="grid size-11 place-items-center rounded-md border border-[#3a4037] bg-[#202420] text-[#d8fa56]"><CalendarDays size={19} /></span>
              <h3 className="mt-4 text-sm font-medium">No maintenance tasks yet</h3>
              <p className="mt-1.5 text-xs leading-5 text-[#929990]">Start with manufacturer-recommended intervals, then tune them to how you ride.</p>
              <Link href="/maintenance" className="mt-4 text-xs font-semibold text-[#d8fa56] hover:text-[#e4ff79]">Create your first task <span aria-hidden="true">-&gt;</span></Link>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[#303630] bg-[#191c19]">
          <div className="border-b border-[#303630] px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <p className="mt-1 text-xs text-[#929990]">Keep the essentials close.</p>
          </div>
          <div className="grid gap-2 p-4 sm:p-5">
            <QuickAction href="/services" icon={Wrench} label="Record a service" />
            <QuickAction href="/expenses" icon={Gauge} label="Update odometer" />
            <QuickAction href="/documents" icon={ShieldCheck} label="Add a document" />
          </div>
        </section>
      </div>

      <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#272c27] pt-4 text-[10px] text-[#737b71] sm:flex-row">
        <span>Manual odometer entry. No GPS or vehicle sensor connection.</span>
        <span>Intervals are yours to set; generic defaults are estimates.</span>
      </footer>
    </AppShell>
  );
}