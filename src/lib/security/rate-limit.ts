import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function consumeUserActionLimit(client: SupabaseClient, action: string, limit: number, windowSeconds = 3600) {
  const { data, error } = await client.rpc("consume_user_action_limit", {
    p_action_name: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}