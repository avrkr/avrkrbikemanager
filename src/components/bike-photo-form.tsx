"use client";

import { useActionState } from "react";
import Image from "next/image";
import { uploadBikePhotoAction, type DocumentActionState } from "@/app/actions/documents";

export function BikePhotoForm({ bikeId, photoUrl }: { bikeId: string; photoUrl?: string }) {
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(uploadBikePhotoAction, {});
  return <form action={action} className="mb-5 flex flex-col gap-4 rounded-md border border-[#303630] bg-[#191c19] p-4 sm:flex-row sm:items-center sm:p-5">
    <input type="hidden" name="bikeId" value={bikeId} />
    {photoUrl ? <Image src={photoUrl} width={88} height={64} unoptimized alt="Motorcycle" className="h-16 w-[88px] rounded-sm border border-[#394039] object-cover" /> : <span className="grid h-16 w-[88px] shrink-0 place-items-center rounded-sm border border-dashed border-[#394039] text-[10px] text-[#7f877e]">No photo</span>}
    <div className="min-w-0 flex-1"><label htmlFor="bike-photo" className="block text-xs font-medium text-[#c7ccc5]">Bike photo <span className="font-normal text-[#7f877e]">JPEG, PNG, WebP · max 10 MB</span></label><input id="bike-photo" name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-xs text-[#a3aaa1] file:mr-3 file:rounded-sm file:border-0 file:bg-[#252b22] file:px-2 file:py-1.5 file:text-xs file:text-[#d8fa56]" />{(state.success || state.error) && <p role="status" className={`mt-2 text-xs ${state.error ? "text-[#ff958b]" : "text-[#d8fa56]"}`}>{state.error ?? state.success}</p>}</div>
    <button disabled={pending} className="h-9 rounded-md border border-[#46513a] px-3 text-xs font-medium text-[#d8fa56] disabled:opacity-60">{pending ? "Uploading…" : "Upload photo"}</button>
  </form>;
}