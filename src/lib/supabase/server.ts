import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnvironment } from "@/lib/env";

export async function createSupabaseServerClient() {
  const environment = getSupabasePublicEnvironment();
  const cookieStore = await cookies();

  return createServerClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Session refresh in Server Components is persisted by proxy.ts.
        }
      },
    },
  });
}