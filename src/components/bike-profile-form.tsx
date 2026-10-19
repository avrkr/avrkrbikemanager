"use client";

import { useActionState } from "react";
import { saveBikeAction, type BikeActionState } from "@/app/actions/bike";

type BikeValues = {
  id?: string;
  manufacturer?: string | null;
  model?: string | null;
  name?: string | null;
  variant?: string | null;
  registration_number?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  manufacturing_year?: number | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_odometer?: number | null;
  fuel_type?: string | null;
  engine_capacity_cc?: number | null;
  front_tyre_size?: string | null;
  rear_tyre_size?: string | null;
  insurance_provider?: string | null;
  insurance_expiry?: string | null;
  puc_expiry?: string | null;
  warranty_expiry?: string | null;
  notes?: string | null;
};

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] placeholder:text-[#687067] focus:border-[#a8bd64] focus:outline-none";
const fields: { name: keyof BikeValues; label: string; type?: string; placeholder?: string }[] = [
  { name: "manufacturer", label: "Manufacturer *", placeholder: "e.g. Honda" },
  { name: "model", label: "Model *", placeholder: "e.g. CB350" },
  { name: "variant", label: "Variant", placeholder: "e.g. DLX Pro" },
  { name: "name", label: "Garage name", placeholder: "e.g. The Weekend Run" },
  { name: "registration_number", label: "Registration number" },
  { name: "manufacturing_year", label: "Manufacturing year", type: "number" },
  { name: "purchase_date", label: "Purchase date", type: "date" },
  { name: "purchase_price", label: "Purchase price (₹)", type: "number" },
  { name: "current_odometer", label: "Current odometer (km)", type: "number" },
  { name: "fuel_type", label: "Fuel type", placeholder: "Petrol, electric…" },
  { name: "engine_capacity_cc", label: "Engine capacity (cc)", type: "number" },
  { name: "front_tyre_size", label: "Front tyre size" },
  { name: "rear_tyre_size", label: "Rear tyre size" },
  { name: "insurance_provider", label: "Insurance provider" },
  { name: "insurance_expiry", label: "Insurance expiry", type: "date" },
  { name: "puc_expiry", label: "PUC expiry", type: "date" },
  { name: "warranty_expiry", label: "Warranty expiry", type: "date" },
  { name: "chassis_number", label: "Chassis number" },
  { name: "engine_number", label: "Engine number" },
];

function getStringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function BikeProfileForm({ bike }: { bike?: BikeValues }) {
  const [state, formAction, isPending] = useActionState<BikeActionState, FormData>(saveBikeAction, {});

  return (
    <form action={formAction} className="rounded-md border border-[#303630] bg-[#191c19]">
      {bike?.id && <input type="hidden" name="id" value={bike.id} />}
      <div className="border-b border-[#303630] px-4 py-4 sm:px-6">
        <h2 className="text-sm font-semibold">Motorcycle details</h2>
        <p className="mt-1 text-xs text-[#929990]">Fields marked * are required. You can fill in the rest as you go.</p>
      </div>
      <div className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {fields.map(({ name, label, type = "text", placeholder }) => <label key={name} className="block text-xs font-medium text-[#c7ccc5]" htmlFor={name}>
          {label}
          <input id={name} name={name} type={type} min={type === "number" ? 0 : undefined} max={name === "manufacturing_year" ? 2100 : undefined} step={name === "purchase_price" ? "0.01" : "1"} defaultValue={getStringValue(bike?.[name])} placeholder={placeholder} className={inputClass} aria-invalid={Boolean(state.fieldErrors?.[name])} />
          {state.fieldErrors?.[name]?.[0] && <span className="mt-1 block text-[11px] text-[#ff786d]">{state.fieldErrors[name][0]}</span>}
        </label>)}
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2 lg:col-span-3" htmlFor="notes">Notes
          <textarea id="notes" name="notes" rows={4} defaultValue={bike?.notes ?? ""} maxLength={5000} className="mt-1.5 w-full rounded-md border border-[#394039] bg-[#151815] px-3 py-2.5 text-sm focus:border-[#a8bd64] focus:outline-none" placeholder="Anything useful about this bike…" />
        </label>
        <label className="block text-xs font-medium text-[#c7ccc5] sm:col-span-2 lg:col-span-3" htmlFor="correction_reason">Odometer correction reason <span className="font-normal text-[#7f877e]">(required only when lowering the reading)</span>
          <input id="correction_reason" name="correction_reason" maxLength={500} className={inputClass} placeholder="Explain the corrected reading" />
        </label>
      </div>
      <div className="flex flex-col gap-3 border-t border-[#303630] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p role="status" className={`text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? "Manual odometer entry; no GPS tracking is used."}</p>
        <button type="submit" disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] hover:bg-[#e4ff79] disabled:opacity-60">
          {isPending ? "Saving…" : bike?.id ? "Save changes" : "Add motorcycle"}
        </button>
      </div>
    </form>
  );
}