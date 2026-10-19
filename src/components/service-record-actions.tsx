"use client";

import { useActionState } from "react";
import { deleteServiceAction, updateServiceAction, type ServiceActionState } from "@/app/actions/service";

type RecordValue = {
  id: string;
  service_date: string;
  odometer: number;
  workshop?: string | null;
  mechanic?: string | null;
  parts_replaced?: string | null;
  work_performed?: string | null;
  oil_brand?: string | null;
  oil_grade?: string | null;
  oil_quantity_litres?: number | null;
  oil_cost?: number | null;
  labour_cost?: number | null;
  total_cost: number;
  notes?: string | null;
};

const inputClass = "mt-1.5 h-9 w-full rounded-md border border-[#394039] bg-[#151815] px-2.5 text-xs text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function ServiceRecordActions({ record }: { record: RecordValue }) {
  const [updateState, updateAction, updating] = useActionState<ServiceActionState, FormData>(updateServiceAction, {});
  const [deleteState, deleteAction, deleting] = useActionState<ServiceActionState, FormData>(deleteServiceAction, {});

  return <div className="mt-4 border-t border-[#303630] pt-3">
    <details>
      <summary className="w-fit cursor-pointer text-[11px] font-medium text-[#a8bd64]">Edit service details</summary>
      <form action={updateAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="id" value={record.id} />
        <label className="text-[11px] text-[#a3aaa1]">Date<input required type="date" name="serviceDate" defaultValue={record.service_date} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Odometer (km)<input required type="number" min="0" name="odometer" defaultValue={record.odometer} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Workshop<input name="workshop" defaultValue={record.workshop ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Mechanic<input name="mechanic" defaultValue={record.mechanic ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Parts replaced<input name="partsReplaced" defaultValue={record.parts_replaced ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Total cost (₹)<input required type="number" min="0" step="0.01" name="totalCost" defaultValue={record.total_cost} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Oil brand<input name="oilBrand" defaultValue={record.oil_brand ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Oil grade<input name="oilGrade" defaultValue={record.oil_grade ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Oil quantity (L)<input type="number" min="0" step="0.01" name="oilQuantityLitres" defaultValue={record.oil_quantity_litres ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Oil cost (₹)<input type="number" min="0" step="0.01" name="oilCost" defaultValue={record.oil_cost ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1]">Labour (₹)<input type="number" min="0" step="0.01" name="labourCost" defaultValue={record.labour_cost ?? ""} className={inputClass} /></label>
        <label className="text-[11px] text-[#a3aaa1] sm:col-span-2 lg:col-span-3">Work performed<textarea name="workPerformed" rows={2} defaultValue={record.work_performed ?? ""} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-2.5 py-2 text-xs" /></label>
        <label className="text-[11px] text-[#a3aaa1] sm:col-span-2 lg:col-span-3">Notes<textarea name="notes" rows={2} defaultValue={record.notes ?? ""} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-2.5 py-2 text-xs" /></label>
        {updateState.error && <p role="alert" className="text-xs text-[#ff958b] sm:col-span-2 lg:col-span-3">{updateState.error}</p>}
        {updateState.success && <p role="status" className="text-xs text-[#d8fa56] sm:col-span-2 lg:col-span-3">{updateState.success}</p>}
        <button disabled={updating} className="h-9 w-fit rounded-md border border-[#46513a] px-3 text-xs font-medium text-[#d8fa56] disabled:opacity-60">{updating ? "Saving…" : "Save edits"}</button>
      </form>
    </details>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Delete this service record? This cannot be undone.")) event.preventDefault(); }} className="mt-3">
      <input type="hidden" name="id" value={record.id} />
      {deleteState.error && <p role="alert" className="mb-2 text-xs text-[#ff958b]">{deleteState.error}</p>}
      {deleteState.success && <p role="status" className="mb-2 text-xs text-[#d8fa56]">{deleteState.success}</p>}
      <button disabled={deleting} className="h-8 rounded-md border border-[#523733] px-3 text-[11px] text-[#ff958b] disabled:opacity-60">{deleting ? "Deleting…" : "Delete service record"}</button>
    </form>
  </div>;
}