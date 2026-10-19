"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { consumeUserActionLimit } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const documentSchema = z.object({
  bikeId: z.string().uuid(),
  documentType: z.enum(["registration", "insurance", "puc", "invoice", "warranty", "receipt", "other"]),
  title: z.string().trim().min(1).max(120),
  expiryDate: z.string().optional().transform((value) => value || null),
  serviceRecordId: z.string().optional().transform((value) => value || null),
});

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxSize = 20 * 1024 * 1024;
const bucket = "private-bike-files";

async function hasValidFileSignature(file: File) {
  const bytes = Buffer.from(await file.slice(0, 12).arrayBuffer());
  if (file.type === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.type === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
}

export type DocumentActionState = { success?: string; error?: string; url?: string };

async function getUserClient() {
  if (!hasSupabaseConfiguration()) return { error: "Configure Supabase and apply the migration before managing documents." } as const;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Your session has expired. Sign in again." } as const;
  return { supabase, user } as const;
}

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100);
  return normalized || "upload";
}

export async function uploadDocumentAction(_previous: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a document title and type." };
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) return { error: "Choose a file to upload." };
  if (fileEntry.size > maxSize) return { error: "Files must be 20 MB or smaller." };
  if (!allowedTypes.has(fileEntry.type) || !(await hasValidFileSignature(fileEntry))) return { error: "Use a valid PDF, JPEG, PNG, or WebP file." };

  const auth = await getUserClient();
  if ("error" in auth) return auth;
  if (!(await consumeUserActionLimit(auth.supabase, "document_upload", 30, 86400))) return { error: "Daily upload limit reached. Try again tomorrow." };
  const { data: bike } = await auth.supabase.from("bikes").select("id").eq("id", parsed.data.bikeId).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };
  if (parsed.data.serviceRecordId) {
    const { data: service } = await auth.supabase.from("service_records").select("id").eq("id", parsed.data.serviceRecordId).eq("bike_id", bike.id).eq("owner_id", auth.user.id).maybeSingle();
    if (!service) return { error: "Choose a service record belonging to this bike." };
  }

  const storagePath = `${auth.user.id}/${bike.id}/${randomUUID()}-${safeFileName(fileEntry.name)}`;
  const { error: uploadError } = await auth.supabase.storage.from(bucket).upload(storagePath, fileEntry, {
    contentType: fileEntry.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return { error: "Upload failed. Confirm the private storage bucket migration has been applied." };

  const { error: insertError } = await auth.supabase.from("documents").insert({
    owner_id: auth.user.id,
    bike_id: bike.id,
    service_record_id: parsed.data.serviceRecordId,
    document_type: parsed.data.documentType,
    title: parsed.data.title,
    storage_path: storagePath,
    file_name: safeFileName(fileEntry.name),
    content_type: fileEntry.type,
    size_bytes: fileEntry.size,
    expiry_date: parsed.data.expiryDate,
  });
  if (insertError) {
    await auth.supabase.storage.from(bucket).remove([storagePath]);
    return { error: "The file uploaded, but its private metadata could not be saved." };
  }
  revalidatePath("/documents");
  revalidatePath("/notifications");
  return { success: "Document uploaded to your private storage." };
}

export async function deleteDocumentAction(_previous: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid document." };
  const auth = await getUserClient();
  if ("error" in auth) return auth;
  if (!(await consumeUserActionLimit(auth.supabase, "document_delete", 30))) return { error: "Too many document changes. Try again in an hour." };
  const { data: document } = await auth.supabase.from("documents").select("storage_path").eq("id", id.data).eq("owner_id", auth.user.id).maybeSingle();
  if (!document) return { error: "Document not found." };
  const { error: removeError } = await auth.supabase.storage.from(bucket).remove([document.storage_path]);
  if (removeError) return { error: "Unable to delete the private file." };
  const { error: deleteError } = await auth.supabase.from("documents").delete().eq("id", id.data).eq("owner_id", auth.user.id);
  if (deleteError) return { error: "File removed, but document metadata could not be deleted." };
  revalidatePath("/documents");
  revalidatePath("/notifications");
  return { success: "Document deleted." };
}

export async function uploadBikePhotoAction(_previous: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const bikeId = z.string().uuid().safeParse(formData.get("bikeId"));
  const file = formData.get("file");
  if (!bikeId.success || !(file instanceof File) || !file.size) return { error: "Choose a photo to upload." };
  if (file.size > 10 * 1024 * 1024) return { error: "Bike photos must be 10 MB or smaller." };
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return { error: "Use a JPEG, PNG, or WebP photo." };
  if (!(await hasValidFileSignature(file))) return { error: "The selected file is not a valid image." };
  const auth = await getUserClient();
  if ("error" in auth) return auth;
  if (!(await consumeUserActionLimit(auth.supabase, "document_upload", 30, 86400))) return { error: "Daily photo upload limit reached. Try again tomorrow." };
  const { data: bike } = await auth.supabase.from("bikes").select("id,photo_path").eq("id", bikeId.data).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Bike not found." };
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const photoPath = `${auth.user.id}/${bike.id}/bike-photo-${randomUUID()}.${extension}`;
  const { error: uploadError } = await auth.supabase.storage.from(bucket).upload(photoPath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "Photo upload failed. Confirm the private storage bucket is configured." };
  const { error: updateError } = await auth.supabase.from("bikes").update({ photo_path: photoPath }).eq("id", bike.id).eq("owner_id", auth.user.id);
  if (updateError) {
    await auth.supabase.storage.from(bucket).remove([photoPath]);
    return { error: "The photo uploaded, but the bike profile could not be updated." };
  }
  if (bike.photo_path) await auth.supabase.storage.from(bucket).remove([bike.photo_path]);
  revalidatePath("/profile");
  revalidatePath("/");
  return { success: "Bike photo updated." };
}