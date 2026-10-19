"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bike,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Menu,
  Plus,
  Settings2,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/services", label: "Service history", icon: ClipboardList },
  { href: "/expenses", label: "Fuel & expenses", icon: Fuel },
  { href: "/documents", label: "Documents", icon: FileText },
];

const mobileNavigation = navigation.slice(0, 4);

function NavLink({ href, label, icon: Icon }: (typeof navigation)[number]) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
        active
          ? "bg-[#252b22] text-[#d8fa56]"
          : "text-[#a3aaa1] hover:bg-white/[0.04] hover:text-[#f0f2ed]"
      }`}
    >
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d8fa56]" />}
    </Link>
  );
}

function MobileNavLink({ href, label, icon: Icon }: (typeof navigation)[number]) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === href : pathname.startsWith(href);
  const mobileLabel = label === "Maintenance" ? "Service" : label === "Service history" ? "History" : label === "Fuel & expenses" ? "Costs" : "Home";
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-[62px] flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-[#d8fa56]" : "text-[#929990]"}`}><Icon size={18} strokeWidth={1.8} />{mobileLabel}</Link>;
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link href="/" className="flex items-center gap-3 px-2 py-2" onClick={onNavigate}>
        <span className="grid size-9 place-items-center rounded-md bg-[#d8fa56] text-[#141712]">
          <Bike size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="font-semibold tracking-[0.02em]">PITLANE</span>
        <span className="ml-auto rounded border border-[#3a4037] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a3aaa1]">
          Garage
        </span>
      </Link>

      <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737b71]">
        Workspace
      </div>
      <nav aria-label="Main navigation" className="mt-3 grid gap-1">
        {navigation.map((item) => (
          <div key={item.href} onClick={onNavigate}>
            <NavLink {...item} />
          </div>
        ))}
      </nav>

      <div className="mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737b71]">
        Manage
      </div>
      <nav aria-label="Account navigation" className="mt-3 grid gap-1">
        <div onClick={onNavigate}>
          <NavLink href="/notifications" label="Reminders" icon={Bell} />
        </div>
        <div onClick={onNavigate}>
          <NavLink href="/settings" label="Settings" icon={Settings2} />
        </div>
      </nav>

      <div className="mt-auto rounded-md border border-[#303630] bg-[#191c19] p-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <CircleHelp size={15} className="text-[#d8fa56]" aria-hidden="true" />
          Need a hand?
        </div>
        <p className="mt-2 text-xs leading-5 text-[#929990]">
          Configure your garage to start tracking maintenance.
        </p>
        <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#d8fa56]" onClick={onNavigate}>
          Set up your bike <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#111311]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#272c27] bg-[#141714] px-4 py-5 lg:flex">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            aria-label="Mobile navigation"
            className="flex h-full w-[min(84vw,300px)] flex-col border-r border-[#303630] bg-[#141714] px-4 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex justify-end">
              <button type="button" aria-label="Close navigation" className="grid size-10 place-items-center rounded-md text-[#a3aaa1] hover:bg-white/[0.06]" onClick={() => setMenuOpen(false)}>
                <X size={19} />
              </button>
            </div>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#272c27] bg-[#111311]/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" className="grid size-10 place-items-center rounded-md text-[#a3aaa1] hover:bg-white/[0.06] lg:hidden" onClick={() => setMenuOpen(true)}>
              <Menu size={19} />
            </button>
            <div className="hidden items-center gap-2 text-xs text-[#929990] sm:flex">
              <span>Garage</span><span className="text-[#596057]">/</span><span className="text-[#f0f2ed]">Overview</span>
            </div>
            <span className="font-semibold tracking-[0.02em] lg:hidden">PITLANE</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden items-center gap-2 text-xs text-[#929990] md:flex">
              <span className="size-1.5 rounded-full bg-[#d8fa56]" />
              Your garage is ready
            </span>
            <Link href="/notifications" aria-label="Notifications" title="Notifications" className="relative grid size-10 place-items-center rounded-md border border-[#303630] text-[#b6bcb4] hover:bg-white/[0.04]">
              <Bell size={17} />
            </Link>
            <button type="button" className="flex h-10 items-center gap-2 rounded-md border border-[#303630] px-2.5 text-sm hover:bg-white/[0.04]" aria-label="Garage menu">
              <span className="grid size-6 place-items-center rounded-sm bg-[#d8fa56]/15 text-[#d8fa56]"><Bike size={14} /></span>
              <span className="hidden text-xs text-[#c7ccc5] sm:inline">My garage</span>
              <ChevronDown size={14} className="text-[#929990]" />
            </button>
          </div>
        </header>

        <main className="dashboard-grid min-h-[calc(100vh-68px)] px-4 pb-24 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pb-10">
          <div className="page-enter mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[#303630] bg-[#141714]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {mobileNavigation.map((item) => <MobileNavLink key={item.href} {...item} />)}
      </nav>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#a8bd64]">{eyebrow}</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.025em] sm:text-[32px]">{title}</h1>
        {detail && <p className="mt-2 text-sm text-[#929990]">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export const dashboardIcons = { Activity, Gauge, Plus };