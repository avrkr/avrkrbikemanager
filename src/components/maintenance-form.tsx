"use client";

import { useActionState, useState } from "react";
import { createMaintenanceTaskAction, type MaintenanceActionState } from "@/app/actions/maintenance";

type MaintenanceType = { id: string; name: string; category: string; guidance_note?: string | null };
const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function MaintenanceForm({ bikeId, types }: { bikeId: string; types: MaintenanceType[] }) {
  const [state, formAction, isPending] = useActionState<MaintenanceActionState, FormData>(createMaintenanceTaskAction, {});
  const [custom, setCustom] = useState(false);

  return (
    <form action={formAction} className="rounded-md border border-[#303630] bg-[#191c19]">
      <input type="hidden" name="bikeId" value={bikeId} />
      <div className="border-b border-[#303630] px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold">Add maintenance task</h2>
        <p className="mt-1 text-xs text-[#929990]">Intervals are estimates unless confirmed in your bike’s service manual.</p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2" htmlFor="typeId">Task
          <select id="typeId" name="typeId" className={inputClass} value={custom ? "custom" : undefined} onChange={(event) => setCustom(event.target.value === "custom")} defaultValue={undefined}>
            <option value="" disabled>Select a maintenance task</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name} · {type.category}{type.guidance_note ? " · estimate" : ""}</option>)}
            <option value="custom">Custom task</option>
          </select>
        </label>
        {custom && <>
          <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="customName">Task name *
            <input id="customName" name="customName" maxLength={120} className={inputClass} placeholder="e.g. Fork seal inspection" />
          </label>
          <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="customCategory">Category
            <input id="customCategory" name="customCategory" maxLength={60} className={inputClass} placeholder="e.g. Suspension" />
          </label>
        </>}
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="lastCompletedDate">Last completed date
          <input id="lastCompletedDate" name="lastCompletedDate" type="date" className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="lastCompletedOdometer">Last completed at (km)
          <input id="lastCompletedOdometer" name="lastCompletedOdometer" type="number" min="0" step="1" className={inputClass} placeholder="Defaults to current reading" />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="intervalDays">Repeat every (days)
          <input id="intervalDays" name="intervalDays" type="number" min="1" max="3650" className={inputClass} placeholder="Optional" />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="intervalKm">Repeat every (km)
          <input id="intervalKm" name="intervalKm" type="number" min="1" max="500000" className={inputClass} placeholder="Optional" />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="estimatedCost">Estimated cost (₹)
          <input id="estimatedCost" name="estimatedCost" type="number" min="0" step="0.01" className={inputClass} placeholder="Optional" />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="priority">Priority
          <select id="priority" name="priority" defaultValue="normal" className={inputClass}>
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2" htmlFor="notes">Notes
          <textarea id="notes" name="notes" rows={2} maxLength={2000} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-3 py-2 text-sm focus:border-[#a8bd64] focus:outline-none" />
        </label>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#303630] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p role="status" className={`text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? state.fieldErrors?.intervalDays?.[0] ?? "Set at least one interval to create a schedule."}</p>
        <button type="submit" disabled={isPending} className="h-10 rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] hover:bg-[#e4ff79] disabled:opacity-60">{isPending ? "Saving…" : "Add task"}</button>
      </div>
    </form>
  );
}