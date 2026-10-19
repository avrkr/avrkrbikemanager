"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const documentSchema = z.object({
  bikeId: z.string().uuid(),
  documentType: z.enum(["registration", "insurance", "puc", "invoice", "warranty", "receipt", "other"]),
  title: z.string().trim().min(1).max(120),
  expiryDate: z.string().optional().transform((value) => value || null),
});

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxSize = 20 * 1024 * 1024;
const bucket = "private-bike-files";

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
  if (!allowedTypes.has(fileEntry.type)) return { error: "Use a PDF, JPEG, PNG, or WebP file." };

  const auth = await getUserClient();
  if ("error" in auth) return auth;
  const { data: bike } = await auth.supabase.from("bikes").select("id").eq("id", parsed.data.bikeId).eq("owner_id", auth.user.id).maybeSingle();
  if (!bike) return { error: "Choose a motorcycle in your garage." };

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

export async function getDocumentUrlAction(_previous: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid document." };
  const auth = await getUserClient();
  if ("error" in auth) return auth;
  const { data: document } = await auth.supabase.from("documents").select("storage_path").eq("id", id.data).eq("owner_id", auth.user.id).maybeSingle();
  if (!document) return { error: "Document not found." };
  const { data, error } = await auth.supabase.storage.from(bucket).createSignedUrl(document.storage_path, 60, { download: true });
  if (error || !data?.signedUrl) return { error: "Unable to create a private download link." };
  return { url: data.signedUrl };
}

export async function deleteDocumentAction(_previous: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid document." };
  const auth = await getUserClient();
  if ("error" in auth) return auth;
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