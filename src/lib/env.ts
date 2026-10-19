import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function hasSupabaseConfiguration() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabasePublicEnvironment() {
  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Supabase configuration is missing or invalid: ${missing}. Copy .env.example to .env.local and configure the values.`);
  }

  return result.data;
}

export function getRequiredServerEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable ${name}. Configure it in .env.local or Vercel Project Settings.`);
  return value;
}