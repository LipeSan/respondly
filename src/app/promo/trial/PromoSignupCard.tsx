"use client";

import { type ComponentProps, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";
import { Input } from "@/components/Input";

type Plan = "starter" | "pro";

export function PromoSignupCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = useMemo<Plan>(() => {
    const raw = String(searchParams.get("plan") ?? "").trim();
    return raw === "starter" ? "starter" : "pro";
  }, [searchParams]);

  const inviteCode = useMemo(() => {
    const fromQuery = String(searchParams.get("code") ?? "").trim();
    const fromEnv = String(process.env.NEXT_PUBLIC_PROMO_TRIAL_INVITE_CODE ?? "").trim();
    return (fromQuery || fromEnv || "VIP90DAYS").toUpperCase();
  }, [searchParams]);

  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  useEffect(() => {
    try {
      window.localStorage.setItem("respondly_trial_invite_code", inviteCode);
    } catch {}
  }, [inviteCode]);

  const startTrialUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("plan", plan);
    params.set("code", inviteCode);
    return `/start-trial?${params.toString()}`;
  }, [inviteCode, plan]);

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({ name: "", email: "", password: "" });

    const nextFieldErrors = { name: "", email: "", password: "" };
    let hasError = false;

    if (!formData.name.trim()) {
      nextFieldErrors.name = "Name is required";
      hasError = true;
    }
    if (!formData.email.trim()) {
      nextFieldErrors.email = "Email is required";
      hasError = true;
    }
    if (!formData.password) {
      nextFieldErrors.password = "Password is required";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error || "Could not create your account");
        return;
      }

      const loginRes = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim(),
        password: formData.password,
        callbackUrl: startTrialUrl,
      });

      if (loginRes?.error) {
        router.push(`/login?next=${encodeURIComponent(startTrialUrl)}`);
        router.refresh();
        return;
      }

      router.push(startTrialUrl);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-[28px] border border-white/10 bg-zinc-950/70 p-6 shadow-[0_40px_120px_-40px_rgba(37,99,235,0.75)] backdrop-blur-xl sm:p-7">
      <div className="absolute -inset-1 -z-10 rounded-[30px] bg-gradient-to-r from-blue-600/20 via-transparent to-green-500/20 blur-2xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Instant signup</p>
          <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight text-white">Activate the offer</h2>
          <p className="mt-2 text-sm text-zinc-400">Create your account and continue with the 90-day trial ready to go.</p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1 text-xs font-semibold text-green-300">
          90 days off
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Starting plan</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["starter", "pro"] as Plan[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPlan(option)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                plan === option
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-200 shadow-[0_0_25px_-12px_rgba(59,130,246,0.9)]"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {option === "starter" ? "Starter" : "Pro"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
          <span>Code applied</span>
          <span className="font-mono text-zinc-300">{inviteCode}</span>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Input
          id="promoName"
          name="promoName"
          type="text"
          label={<span className="!text-zinc-300">Name</span>}
          placeholder="Your name"
          value={formData.name}
          error={fieldErrors.name}
          className="!border-white/10 !bg-black/30 !text-white !placeholder-zinc-500 focus:!ring-blue-500"
          onChange={(e) => {
            setFormData((current) => ({ ...current, name: e.target.value }));
            if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: "" }));
          }}
        />
        <Input
          id="promoEmail"
          name="promoEmail"
          type="email"
          autoComplete="email"
          label={<span className="!text-zinc-300">Email</span>}
          placeholder="name@company.com"
          value={formData.email}
          error={fieldErrors.email}
          className="!border-white/10 !bg-black/30 !text-white !placeholder-zinc-500 focus:!ring-blue-500"
          onChange={(e) => {
            setFormData((current) => ({ ...current, email: e.target.value }));
            if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: "" }));
          }}
        />
        <Input
          id="promoPassword"
          name="promoPassword"
          type="password"
          autoComplete="new-password"
          label={<span className="!text-zinc-300">Password</span>}
          placeholder="Create a password"
          value={formData.password}
          error={fieldErrors.password}
          className="!border-white/10 !bg-black/30 !text-white !placeholder-zinc-500 focus:!ring-blue-500"
          onChange={(e) => {
            setFormData((current) => ({ ...current, password: e.target.value }));
            if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: "" }));
          }}
        />

        {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}

        <Button
          type="submit"
          isLoading={loading}
          className="!mt-2 !w-full !rounded-xl shadow-[0_0_32px_-12px_rgba(34,197,94,0.6)]"
        >
          <span className="inline-flex items-center gap-2">
            Create account & continue
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </form>

      <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          Card required. Cancel anytime.
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          You can change plans later.
        </div>
      </div>

      <div className="mt-5 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(startTrialUrl)}`} className="font-semibold text-blue-300 hover:text-white">
          Sign in
        </Link>
      </div>
    </div>
  );
}
