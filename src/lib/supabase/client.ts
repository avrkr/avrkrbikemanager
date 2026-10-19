"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnvironment } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const environment = getSupabasePublicEnvironment();
  return createBrowserClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}