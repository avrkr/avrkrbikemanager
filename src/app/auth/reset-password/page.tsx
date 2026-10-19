"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(128),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export default function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    setMessage("");
    setError(false);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password: values.password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now sign in with it.");
      form.reset();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Unable to update your password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111311] px-4 py-10">
      <section className="w-full max-w-[420px] rounded-md border border-[#303630] bg-[#191c19] p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8bd64]">Account security</p>
        <h1 className="mt-2 text-2xl font-semibold">Choose a new password</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {(["password", "confirmPassword"] as const).map((field) => <label key={field} className="block text-xs font-medium capitalize text-[#c7ccc5]" htmlFor={field}>{field === "password" ? "New password" : "Confirm password"}
            <input id={field} type="password" autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm" {...form.register(field)} />
            {form.formState.errors[field] && <span className="mt-1 block text-xs text-[#ff786d]">{form.formState.errors[field]?.message}</span>}
          </label>)}
          {message && <p role="status" className={`rounded-md border px-3 py-2.5 text-xs leading-5 ${error ? "border-[#713d39] bg-[#321e1c] text-[#ffaaa2]" : "border-[#43502f] bg-[#252b22] text-[#d8fa56]"}`}>{message}</p>}
          <button className="h-11 w-full rounded-md bg-[#d8fa56] text-sm font-semibold text-[#151811]">Update password</button>
        </form>
        <Link href="/auth/sign-in" className="mt-5 block text-center text-xs text-[#a8bd64]">Back to sign in</Link>
      </section>
    </main>
  );
}