import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseConfiguration } from "@/lib/env";
import { consumeUserActionLimit } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success || !hasSupabaseConfiguration()) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await consumeUserActionLimit(supabase, "document_download", 120))) return NextResponse.json({ error: "Too many downloads. Try again in an hour." }, { status: 429 });
  const { data: document } = await supabase.from("documents").select("storage_path").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data, error } = await supabase.storage.from("private-bike-files").createSignedUrl(document.storage_path, 60, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Unable to create a private download link." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}