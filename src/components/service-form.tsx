"use client";

import { useActionState } from "react";
import { createServiceAction, type ServiceActionState } from "@/app/actions/service";

type TaskOption = { id: string; name: string; category: string };
const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function ServiceForm({ bikeId, tasks }: { bikeId: string; tasks: TaskOption[] }) {
  const [state, formAction, isPending] = useActionState<ServiceActionState, FormData>(createServiceAction, {});

  return (
    <form action={formAction} className="rounded-md border border-[#303630] bg-[#191c19]">
      <input type="hidden" name="bikeId" value={bikeId} />
      <div className="border-b border-[#303630] px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Record a service</h2><p className="mt-1 text-xs text-[#929990]">Saving updates the linked maintenance task and odometer atomically.</p></div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="serviceDate">Service date *<input id="serviceDate" type="date" name="serviceDate" required className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="odometer">Odometer (km) *<input id="odometer" type="number" name="odometer" min="0" step="1" required className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="maintenanceTaskId">Completed task<select id="maintenanceTaskId" name="maintenanceTaskId" defaultValue="" className={inputClass}><option value="">General service / no linked task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.name} · {task.category}</option>)}</select></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="workshop">Workshop<input id="workshop" name="workshop" maxLength={160} className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="mechanic">Mechanic<input id="mechanic" name="mechanic" maxLength={120} className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="partsReplaced">Parts replaced<input id="partsReplaced" name="partsReplaced" maxLength={2000} className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="oilBrand">Oil brand<input id="oilBrand" name="oilBrand" maxLength={100} className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="oilGrade">Oil grade<input id="oilGrade" name="oilGrade" maxLength={60} placeholder="e.g. 10W-40" className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="oilQuantityLitres">Oil quantity (L)<input id="oilQuantityLitres" name="oilQuantityLitres" type="number" min="0" step="0.01" className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="oilCost">Oil cost (₹)<input id="oilCost" name="oilCost" type="number" min="0" step="0.01" className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="labourCost">Labour (₹)<input id="labourCost" name="labourCost" type="number" min="0" step="0.01" className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="totalCost">Total cost (₹) *<input id="totalCost" name="totalCost" type="number" min="0" step="0.01" required className={inputClass} /></label>
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2 lg:col-span-3" htmlFor="workPerformed">Work performed<textarea id="workPerformed" name="workPerformed" rows={3} maxLength={5000} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-3 py-2 text-sm focus:border-[#a8bd64] focus:outline-none" /></label>
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2 lg:col-span-3" htmlFor="notes">Notes<textarea id="notes" name="notes" rows={2} maxLength={5000} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-3 py-2 text-sm focus:border-[#a8bd64] focus:outline-none" /></label>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#303630] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p role="status" className={`text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? "Invoices and receipts can be attached from Documents."}</p><button disabled={isPending} className="h-10 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] disabled:opacity-60">{isPending ? "Saving…" : "Save service"}</button></div>
    </form>
  );
}