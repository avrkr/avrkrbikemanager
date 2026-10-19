"use client";

import { useActionState } from "react";
import { deleteDocumentAction, uploadDocumentAction, type DocumentActionState } from "@/app/actions/documents";

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] focus:border-[#a8bd64] focus:outline-none";

export function DocumentUploadForm({ bikeId, today }: { bikeId: string; today: string }) {
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(uploadDocumentAction, {});
  return <form action={action} encType="multipart/form-data" className="rounded-md border border-[#303630] bg-[#191c19] p-4 sm:p-5">
    <input type="hidden" name="bikeId" value={bikeId} />
    <h2 className="text-sm font-semibold">Upload a document</h2><p className="mt-1 text-xs text-[#929990]">Private files · PDF, JPEG, PNG, or WebP · up to 20 MB.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-[#c7ccc5]">Title<input required name="title" maxLength={120} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Type<select name="documentType" defaultValue="registration" className={inputClass}><option value="registration">Registration certificate</option><option value="insurance">Insurance</option><option value="puc">PUC certificate</option><option value="invoice">Service invoice</option><option value="warranty">Warranty</option><option value="receipt">Parts receipt</option><option value="other">Other</option></select></label>
      <label className="text-xs text-[#c7ccc5]">Expiry date <span className="text-[#7f877e]">(insurance / PUC)</span><input type="date" name="expiryDate" min={today} className={inputClass} /></label>
      <label className="text-xs text-[#c7ccc5]">Choose file<input required type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1.5 block min-h-10 w-full rounded-md border border-[#394039] bg-[#151815] px-2 py-2 text-xs file:mr-3 file:rounded-sm file:border-0 file:bg-[#252b22] file:px-2 file:py-1 file:text-xs file:text-[#d8fa56]" /></label>
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-[#303630] pt-4"><p role="status" className={`min-h-4 text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success ?? ""}</p><button disabled={pending} className="h-10 w-fit rounded-md bg-[#d8fa56] px-4 text-xs font-semibold text-[#151811] disabled:opacity-60">{pending ? "Uploading…" : "Upload document"}</button></div>
  </form>;
}

export function DocumentControls({ id }: { id: string }) {
  const [deleteState, deleteAction, deleting] = useActionState<DocumentActionState, FormData>(deleteDocumentAction, {});

  return <div className="flex flex-wrap items-center gap-2">
    <a href={`/api/documents/${id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-md border border-[#46513a] px-3 text-[11px] font-medium text-[#d8fa56]">Download</a>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Delete this private document? This cannot be undone.")) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><button disabled={deleting} className="h-8 rounded-md border border-[#523733] px-3 text-[11px] text-[#ff958b] disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button></form>
    {deleteState.error && <p role="alert" className="w-full text-[10px] text-[#ff958b]">{deleteState.error}</p>}
    {deleteState.success && <p role="status" className="w-full text-[10px] text-[#d8fa56]">{deleteState.success}</p>}
  </div>;
}