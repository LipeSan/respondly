 "use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { InlineNotification } from "@/components/InlineNotification";
import { Text } from "@/components/Text";
import { formatDate } from "@/lib/date";

type Subscription = {
  plan: string;
  status: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  currentPeriodEnd?: string | null;
  trialUsedAt?: string | null;
  trialEndsAt?: string | null;
} | null;

type Business = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  subscription?: Subscription;
};

export default function StartTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <Text variant="body" className="font-medium">Loading…</Text>
          </div>
        </div>
      }
    >
      <StartTrialInner />
    </Suspense>
  );
}

function StartTrialInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = useMemo(() => {
    const raw = searchParams.get("plan");
    return raw === "starter" ? "starter" : "pro";
  }, [searchParams]);

  const initialInviteCode = useMemo(() => {
    return String(searchParams.get("code") ?? "").trim();
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  const [inviteCode, setInviteCode] = useState(initialInviteCode);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const buildStartTrialPath = (code = inviteCode) => {
    const params = new URLSearchParams();
    if (plan) params.set("plan", plan);
    if (code.trim()) params.set("code", code.trim().toUpperCase());
    const query = params.toString();
    return query ? `/start-trial?${query}` : "/start-trial";
  };

  const business = businesses[0] ?? null;
  const subscription = business?.subscription ?? null;
  const trialEligible = !subscription?.trialUsedAt;
  const hasInviteCode = inviteCode.trim().length > 0;
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  const isPromo90DaysOffer = normalizedInviteCode === "VIP90DAYS";
  const hasActive =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    Boolean(subscription?.cancelAtPeriodEnd);

  async function load() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/businesses", { cache: "no-store" });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(buildStartTrialPath())}`);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load account");
      setBusinesses((data?.businesses ?? []) as Business[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const normalized = initialInviteCode.trim();
    if (normalized) {
      const upper = normalized.toUpperCase();
      setInviteCode(upper);
      try {
        window.localStorage.setItem("respondly_trial_invite_code", upper);
      } catch {
      }
      return;
    }

    try {
      const stored = String(window.localStorage.getItem("respondly_trial_invite_code") ?? "").trim();
      if (!stored) return;
      const upper = stored.toUpperCase();
      setInviteCode((current) => (current.trim() ? current : upper));
    } catch {
    }
  }, [initialInviteCode]);

  async function startCheckout() {
    setStartingTrial(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...(inviteCode.trim() ? { inviteCode: inviteCode.trim().toUpperCase() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(buildStartTrialPath())}`);
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");
      if (!data?.url) throw new Error("Stripe checkout URL not returned");
      window.location.href = String(data.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setError(msg);
    } finally {
      setStartingTrial(false);
    }
  }

  async function onCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    setCreatingBusiness(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(buildStartTrialPath())}`);
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to create business");

      setNotice("Business created. Redirecting to checkout…");
      await load();
      await startCheckout();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setError(msg);
    } finally {
      setCreatingBusiness(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <Text variant="h1">Start your free trial</Text>
            <Text variant="body" className="mt-2 text-gray-600">
              {isPromo90DaysOffer
                ? "90-day free trial. Card required. Cancel anytime."
                : "30-day free trial. Card required. Cancel anytime."}
            </Text>
          </div>

          {error ? <InlineNotification tone="error" centered>{error}</InlineNotification> : null}
          {notice ? <InlineNotification tone="info" centered>{notice}</InlineNotification> : null}

          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
            {!business ? (
              <form className="space-y-6" onSubmit={onCreateBusiness}>
                <Input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  label={<>Business Name <span className="text-red-500">*</span></>}
                  placeholder="e.g. My Business"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input
                    id="businessPhone"
                    name="businessPhone"
                    type="tel"
                    label="Phone"
                    placeholder="+61 …"
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  />
                  <Input
                    id="businessEmail"
                    name="businessEmail"
                    type="email"
                    label="Email"
                    placeholder="contact@…"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <Input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  label="Invite code (optional)"
                  placeholder="e.g. VIP90…"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />

                <div>
                  <Button type="submit" isLoading={creatingBusiness || startingTrial} disabled={creatingBusiness || startingTrial}>
                    Create business & start trial
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <Text variant="subtitle" className="font-bold text-gray-900">{business.name}</Text>
                  <Text variant="body" className="mt-1 text-sm text-gray-600">
                    {hasActive
                      ? "You already have an active subscription."
                      : trialEligible
                        ? isPromo90DaysOffer
                          ? "You’re eligible for a 90-day free trial with this offer."
                          : "You’re eligible for a free trial."
                        : hasInviteCode
                          ? "This invite code can still apply an extended trial."
                          : "Trial already used for this business."}
                  </Text>
                  {subscription?.trialEndsAt ? (
                    <Text variant="body" className="mt-2 text-xs text-gray-500">
                      Trial ends on {formatDate(subscription.trialEndsAt)}.
                    </Text>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <Input
                    id="inviteCodeExisting"
                    name="inviteCodeExisting"
                    type="text"
                    label="Invite code (optional)"
                    placeholder="e.g. VIP90…"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                  <Button onClick={startCheckout} isLoading={startingTrial} disabled={startingTrial}>
                    {trialEligible
                      ? isPromo90DaysOffer
                        ? "Start 90-day free trial"
                        : "Start 30-day free trial"
                      : hasInviteCode
                        ? "Continue with invite code"
                        : "Continue to checkout"}
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/subscription")} className="!w-auto">
                    Manage subscription
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-600">
            <Text variant="body" as="span">Prefer to explore first? </Text>
            <Text variant="link" as={Link} href="/dashboard">
              Go to dashboard
            </Text>
            <Text variant="body" as="span">.</Text>
          </div>
        </div>
      </div>
    </div>
  );
}
