import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getRequiredServerEnvironment, getSupabasePublicEnvironment } from "@/lib/env";

export function createSupabaseAdminClient() {
  const environment = getSupabasePublicEnvironment();
  const serviceRoleKey = getRequiredServerEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(environment.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}