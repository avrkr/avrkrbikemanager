"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Bike, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const formSchema = z.object({
  displayName: z.string().trim().max(80, "Name must be 80 characters or fewer").optional(),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email address") });
type FormValues = z.infer<typeof formSchema>;

const fieldClass = "mt-1.5 h-11 w-full rounded-md border border-[#394039] bg-[#151815] px-3 text-sm text-[#f0f2ed] placeholder:text-[#687067] focus:border-[#a8bd64] focus:outline-none";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" | "forgot-password" }) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { displayName: "", email: "", password: "" } });

  async function handleSubmit(values: FormValues) {
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { display_name: values.displayName?.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox for a confirmation link to finish creating your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
        if (error) throw error;
        const requestedNext = new URLSearchParams(window.location.search).get("next") ?? "/";
        const nextUrl = new URL(requestedNext, window.location.origin);
        window.location.assign(nextUrl.origin === window.location.origin ? `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` : "/");
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to complete the request. Check your Supabase configuration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const emailResult = emailSchema.safeParse({ email: form.getValues("email") });
    if (!emailResult.success) {
      form.setError("email", { message: emailResult.error.issues[0]?.message });
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(emailResult.data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) throw error;
      setMessage("If an account exists for that email, a password reset link is on its way.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to send the reset link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "sign-up" ? "Make it yours." : mode === "forgot-password" ? "Reset your password." : "Welcome back.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111311] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-[#f0f2ed]">
          <span className="grid size-9 place-items-center rounded-md bg-[#d8fa56] text-[#141712]"><Bike size={19} /></span>
          PITLANE
        </Link>
        <section className="rounded-md border border-[#303630] bg-[#191c19] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8bd64]">Your bike, looked after</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
          <p className="mt-2 text-sm text-[#929990]">
            {mode === "sign-up" ? "Create a secure account for your maintenance records." : mode === "forgot-password" ? "We’ll send a secure link to your email address." : "Sign in to keep your garage up to date."}
          </p>

          {mode === "forgot-password" ? (
            <form onSubmit={handlePasswordReset} className="mt-7 space-y-4">
              <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="email">Email address
                <input id="email" type="email" autoComplete="email" className={fieldClass} {...form.register("email")} />
              </label>
              {form.formState.errors.email && <p className="text-xs text-[#ff786d]">{form.formState.errors.email.message}</p>}
              {message && <p role="status" className={`rounded-md border px-3 py-2.5 text-xs leading-5 ${isError ? "border-[#713d39] bg-[#321e1c] text-[#ffaaa2]" : "border-[#43502f] bg-[#252b22] text-[#d8fa56]"}`}>{message}</p>}
              <button disabled={isSubmitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#d8fa56] text-sm font-semibold text-[#151811] hover:bg-[#e4ff79] disabled:opacity-60">
                {isSubmitting && <LoaderCircle className="animate-spin" size={16} />} Send reset link
              </button>
              <Link href="/auth/sign-in" className="flex items-center justify-center gap-1.5 pt-1 text-xs text-[#a3aaa1] hover:text-white"><ArrowLeft size={13} /> Back to sign in</Link>
            </form>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-7 space-y-4">
              {mode === "sign-up" && <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="displayName">Name
                <input id="displayName" autoComplete="name" className={fieldClass} {...form.register("displayName")} />
                {form.formState.errors.displayName && <span className="mt-1 block text-xs text-[#ff786d]">{form.formState.errors.displayName.message}</span>}
              </label>}
              <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="email">Email address
                <input id="email" type="email" autoComplete="email" className={fieldClass} {...form.register("email")} />
                {form.formState.errors.email && <span className="mt-1 block text-xs text-[#ff786d]">{form.formState.errors.email.message}</span>}
              </label>
              <label className="block text-xs font-medium text-[#c7ccc5]" htmlFor="password">Password
                <input id="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className={fieldClass} {...form.register("password")} />
                {form.formState.errors.password && <span className="mt-1 block text-xs text-[#ff786d]">{form.formState.errors.password.message}</span>}
              </label>
              {mode === "sign-in" && <div className="-mt-1 text-right"><Link href="/auth/forgot-password" className="text-xs text-[#a8bd64] hover:text-[#d8fa56]">Forgot password?</Link></div>}
              {message && <p role="status" className={`rounded-md border px-3 py-2.5 text-xs leading-5 ${isError ? "border-[#713d39] bg-[#321e1c] text-[#ffaaa2]" : "border-[#43502f] bg-[#252b22] text-[#d8fa56]"}`}>{message}</p>}
              <button disabled={isSubmitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#d8fa56] text-sm font-semibold text-[#151811] hover:bg-[#e4ff79] disabled:opacity-60">
                {isSubmitting && <LoaderCircle className="animate-spin" size={16} />}
                {mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
              <p className="text-center text-xs text-[#929990]">
                {mode === "sign-in" ? "New to Pitlane? " : "Already have an account? "}
                <Link href={mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"} className="font-medium text-[#d8fa56]">{mode === "sign-in" ? "Create an account" : "Sign in"}</Link>
              </p>
            </form>
          )}
        </section>
        <p className="mt-5 text-center text-[10px] leading-5 text-[#70786f]">Your records are private and protected by Supabase authentication and row-level security.</p>
      </div>
    </main>
  );
}