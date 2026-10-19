"use client";

import { useActionState } from "react";
import { createExpenseAction, createFuelAction, updateOdometerAction, type ExpenseActionState } from "@/app/actions/expenses";

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

function ActionFeedback({ state }: { state: ExpenseActionState }) {
  return <p role="status" className={`min-h-4 text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? ""}</p>;
}

export function FuelForm({ bikeId, today }: { bikeId: string; today: string }) {
  const [state, action, pending] = useActionState<ExpenseActionState, FormData>(createFuelAction, {});
  return <form action={action} className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5">
    <input type="hidden" name="bikeId" value={bikeId} />
    <h2 className="text-sm font-semibold">Log fuel</h2><p className="mt-1 text-xs text-[#929990]">Fuel entries also add an expense and update the odometer.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-[#c7ccc5]">Refuelling date<input required type="date" name="refuelledAt" defaultValue={today} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Odometer (km)<input required type="number" min="0" name="odometer" className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Litres<input required type="number" min="0.001" step="0.001" name="litres" className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Price per litre (₹)<input required type="number" min="0" step="0.01" name="pricePerLitre" className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5] sm:col-span-2">Fuel station<input name="fuelStation" maxLength={160} className={inputClass} /></label>
      <label className="flex min-h-10 items-center gap-2 text-xs text-[#c7ccc5] sm:col-span-2"><input type="checkbox" name="fullTank" defaultChecked className="size-4 accent-[#d8fa56]" /> Filled to full tank <span className="text-[#7f877e]">(used for km/L estimate)</span></label>
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-[#303630] pt-4"><ActionFeedback state={state} /><button disabled={pending} className="h-10 w-fit rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] disabled:opacity-60">{pending ? "Saving…" : "Save fuel stop"}</button></div>
  </form>;
}

export function ExpenseForm({ bikeId, today }: { bikeId: string; today: string }) {
  const [state, action, pending] = useActionState<ExpenseActionState, FormData>(createExpenseAction, {});
  return <form action={action} className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5">
    <input type="hidden" name="bikeId" value={bikeId} />
    <h2 className="text-sm font-semibold">Add expense</h2><p className="mt-1 text-xs text-[#929990]">Service and fuel costs are added automatically from their own records.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-[#c7ccc5]">Date<input required type="date" name="expenseDate" defaultValue={today} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Category<select name="category" defaultValue="parts" className={inputClass}><option value="maintenance">Maintenance</option><option value="parts">Spare parts</option><option value="repair">Repair</option><option value="insurance">Insurance</option><option value="accessories">Accessories</option><option value="other">Other</option></select></label>
      <label className="text-xs text-[#c7ccc5]">Description<input required name="description" maxLength={160} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Amount (₹)<input required type="number" min="0" step="0.01" name="amount" className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5] sm:col-span-2">Odometer (km, optional)<input type="number" min="0" name="odometer" className={inputClass} /></label>
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-[#303630] pt-4"><ActionFeedback state={state} /><button disabled={pending} className="h-10 w-fit rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] disabled:opacity-60">{pending ? "Saving…" : "Save expense"}</button></div>
  </form>;
}

export function OdometerForm({ bikeId }: { bikeId: string }) {
  const [state, action, pending] = useActionState<ExpenseActionState, FormData>(updateOdometerAction, {});
  return <form action={action} className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5">
    <input type="hidden" name="bikeId" value={bikeId} />
    <h2 className="text-sm font-semibold">Update odometer</h2><p className="mt-1 text-xs text-[#929990]">Manual entry only; no GPS or vehicle sensors are connected.</p>
    <div className="mt-4 grid gap-3">
      <label className="text-xs text-[#c7ccc5]">Current reading (km)<input required type="number" min="0" name="odometer" className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Correction reason <span className="text-[#7f877e]">(required if reading decreases)</span><input name="correctionReason" maxLength={500} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Note<input name="notes" maxLength={2000} className={inputClass} /></label>
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-[#303630] pt-4"><ActionFeedback state={state} /><button disabled={pending} className="h-10 w-fit rounded-md border border-[#46513a] px-4 text-xs font-medium text-[#d8fa56] disabled:opacity-60">{pending ? "Saving…" : "Update reading"}</button></div>
  </form>;
}