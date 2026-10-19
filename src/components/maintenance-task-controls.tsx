"use client";

import { useActionState } from "react";
import { deleteMaintenanceTaskAction, updateMaintenanceTaskAction, type MaintenanceActionState } from "@/app/actions/maintenance";

type TaskValue = {
  id: string;
  name: string;
  category: string;
  last_completed_date: string | null;
  last_completed_odometer: number | null;
  interval_days: number | null;
  interval_km: number | null;
  estimated_cost: number | null;
  priority: "low" | "normal" | "high" | "critical";
  notes: string | null;
};
const inputClass = "mt-1.5 h-9 w-full rounded-md border border-[#394039] bg-[#151815] px-2.5 text-xs text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function MaintenanceTaskControls({ task }: { task: TaskValue }) {
  const [editState, editAction, editing] = useActionState<MaintenanceActionState, FormData>(updateMaintenanceTaskAction, {});
  const [archiveState, archiveAction, archiving] = useActionState<MaintenanceActionState, FormData>(deleteMaintenanceTaskAction, {});

  return <>
    <details className="mt-3 border-t border-[#303630] pt-3">
      <summary className="w-fit cursor-pointer text-[11px] font-medium text-[#a8bd64]">Edit intervals and task</summary>
      <form action={editAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="taskId" value={task.id} />
        <label className="text-[11px] text-[#a3aaa1]">Task name<input required name="name" maxLength={120} defaultValue={task.name} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Category<input required name="category" maxLength={60} defaultValue={task.category} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Last completed date<input type="date" name="lastCompletedDate" defaultValue={task.last_completed_date ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Last completed odometer (km)<input type="number" min="0" name="lastCompletedOdometer" defaultValue={task.last_completed_odometer ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Repeat every (days)<input type="number" min="1" max="3650" name="intervalDays" defaultValue={task.interval_days ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Repeat every (km)<input type="number" min="1" max="500000" name="intervalKm" defaultValue={task.interval_km ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Estimated cost (₹)<input type="number" min="0" step="0.01" name="estimatedCost" defaultValue={task.estimated_cost ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Priority<select name="priority" defaultValue={task.priority} className={inputClass}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label className="text-[11px] text-[#a3aaa1] sm:col-span-2 lg:col-span-3">Notes<textarea name="notes" rows={2} maxLength={2000} defaultValue={task.notes ?? ""} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-2.5 py-2 text-xs" /></label>
        {(editState.error || editState.success) && <p role="status" className={`text-xs sm:col-span-2 lg:col-span-3 ${editState.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{editState.error ?? editState.success}</p>}
        <button disabled={editing} className="h-9 w-fit rounded-md border border-[#46513a] px-3 text-xs font-medium text-[#d8fa56] disabled:opacity-60">{editing ? "Saving…" : "Save schedule"}</button>
      </form>
    </details>
    <form action={archiveAction} onSubmit={(event) => { if (!window.confirm("Archive this maintenance schedule? Existing service records will be kept.")) event.preventDefault(); }} className="mt-3 border-t border-[#303630] pt-3">
      <input type="hidden" name="taskId" value={task.id} />
      {(archiveState.error || archiveState.success) && <p role="status" className={`mb-2 text-xs ${archiveState.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{archiveState.error ?? archiveState.success}</p>}
      <button disabled={archiving} className="h-8 rounded-md border border-[#523733] px-3 text-[11px] text-[#ff958b] disabled:opacity-60">{archiving ? "Archiving…" : "Archive schedule"}</button>
    </form>
  </>;
}