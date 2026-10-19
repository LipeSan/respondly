"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { PlanCard } from "@/components/PlanCard";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";
import { Textarea } from "@/components/Textarea";
import { BillingPlans } from "@/components/BillingPlans";
import { AutoReplyCard } from "@/components/AutoReplyCard";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/date";

type Business = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  google?: {
    id: string;
    createdAt: string;
  } | null;
  subscription?: {
    plan: string;
    status: string;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
};

type AiSettings = {
  systemPrompt: string;
  tone: string;
  maxLength: number;
};

function normalizeTone(v: unknown) {
  const t = String(v ?? "").trim().toLowerCase();
  if (t === "warm" || t === "friendly") return "warm";
  if (t === "polite" || t === "professional") return "polite";
  return "polite";
}

function ConfigurationSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading configuration">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-48 rounded-2xl bg-gray-100 lg:col-span-2" />
        <div className="h-48 rounded-2xl bg-gray-100" />
      </div>
      <div className="h-24 rounded-2xl bg-gray-100" />
      <div className="h-40 rounded-2xl bg-gray-100" />
    </div>
  );
}

export default function ConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<null | "starter" | "pro">(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [autoResponderEnabled, setAutoResponderEnabled] = useState<boolean | null>(
    null
  );
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    systemPrompt: `You are a customer support assistant that writes replies to Google reviews.
Rules:
- Be polite and professional.
- Never argue with the customer.
- Never admit legal fault.
- Do not offer refunds unless explicitly configured.
- Reply in the same language as the review.
- If rating is 1-3 stars, apologize and invite the customer to contact the business.
- If rating is 4-5 stars, thank the customer warmly.`,
    tone: "polite",
    maxLength: 600,
  });


  const business = useMemo(() => businesses[0], [businesses]);
  const subscription = business?.subscription ?? null;
  const statusRaw = subscription?.status ?? "none";
  const isCancelScheduled = Boolean(subscription?.cancelAtPeriodEnd && statusRaw !== "canceled");
  const hasActiveSubscription = statusRaw === "active" || statusRaw === "trialing" || isCancelScheduled;
  const canConfigureAi = subscription?.plan === "pro" && (statusRaw === "active" || statusRaw === "trialing");

  const cancelAtDate = subscription?.cancelAt
    ? new Date(subscription.cancelAt)
    : subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;

  const buildConfigurationPath = () => {
    const params = new URLSearchParams();
    if (inviteCode.trim()) params.set("code", inviteCode.trim().toUpperCase());
    const query = params.toString();
    return query ? `/configuration?${query}` : "/configuration";
  };

  let statusLabel = "No active subscription";
  let badgeClasses = "bg-gray-100 border-gray-200 text-gray-700";
  let dotClasses = "bg-gray-400";

  if (statusRaw === "active") {
    statusLabel = "Active";
    badgeClasses = "bg-emerald-100 border-emerald-200 text-emerald-800";
    dotClasses = "bg-emerald-500";
  } else if (statusRaw === "trialing") {
    statusLabel = "Trialing";
    badgeClasses = "bg-emerald-100 border-emerald-200 text-emerald-800";
    dotClasses = "bg-emerald-500";
  } else if (statusRaw === "past_due") {
    statusLabel = "Past due";
    badgeClasses = "bg-amber-100 border-amber-200 text-amber-800";
    dotClasses = "bg-amber-500";
  } else if (statusRaw === "incomplete" || statusRaw === "incomplete_expired") {
    statusLabel = "Incomplete";
    badgeClasses = "bg-yellow-100 border-yellow-200 text-yellow-800";
    dotClasses = "bg-yellow-500";
  } else if (statusRaw === "canceled") {
    statusLabel = "Canceled";
    badgeClasses = "bg-red-100 border-red-200 text-red-800";
    dotClasses = "bg-red-500";
  }

  if (isCancelScheduled) {
    statusLabel = "Cancel scheduled";
    badgeClasses = "bg-amber-100 border-amber-200 text-amber-800";
    dotClasses = "bg-amber-500";
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", { cache: "no-store" });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(buildConfigurationPath())}`);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load businesses");
      setBusinesses(data.businesses ?? []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe(plan: "starter" | "pro") {
    try {
      setSubscribing(plan);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          ...(inviteCode.trim() ? { inviteCode: inviteCode.trim().toUpperCase() } : {}),
        }),
      });

      const data: { url?: string; error?: string } = await res
        .json()
        .catch(() => ({} as { url?: string; error?: string }));
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(buildConfigurationPath())}`);
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");

      if (!data?.url) throw new Error("Stripe checkout URL was not returned");
      window.location.href = data.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      showToast({ type: "error", message: msg });
    } finally {
      setSubscribing(null);
    }
  }

  async function loadAiSettings() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/businesses/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load AI settings");

      setAiConfigured(Boolean(data?.aiConfigured));
      setAutoResponderEnabled(
        typeof data?.autoResponderEnabled === "boolean" ? data.autoResponderEnabled : null
      );
      const s = data?.aiSettings;
      if (s && typeof s === "object") {
        setAiSettings((prev) => ({
          systemPrompt: typeof s.systemPrompt === "string" ? s.systemPrompt : prev.systemPrompt,
          tone: typeof s.tone === "string" ? normalizeTone(s.tone) : prev.tone,
          maxLength: typeof s.maxLength === "number" ? s.maxLength : prev.maxLength,
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveAiSettings() {
    setAiSaving(true);
    setAiError(null);
    try {
      const payload = {
        aiSettings: {
          systemPrompt: aiSettings.systemPrompt,
          tone: aiSettings.tone,
          maxLength: aiSettings.maxLength,
        },
      };

      const res = await fetch("/api/businesses/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save AI settings");

      showToast({ type: "success", message: "AI settings saved." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setAiError(msg);
      showToast({ type: "error", message: msg });
    } finally {
      setAiSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (business?.id) {
      loadAiSettings();
    }
  }, [business?.id]);

  useEffect(() => {
    setInviteCode(String(searchParams.get("code") ?? "").trim().toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    const billing = searchParams.get("billing");
    const sessionId = searchParams.get("session_id");
    if (billing === "success") {
      if (sessionId) {
        fetch(
          `/api/billing/checkout?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        )
          .then(() => load())
          .catch(() => load());
      }
      showToast({
        type: "success",
        message: "Payment completed successfully. Your subscription is active.",
      });
    }
    if (billing === "cancel") {
      showToast({
        type: "info",
        message: "Payment canceled. You can try again whenever you want.",
      });
    }
  }, [searchParams, showToast]);

  const planName =
    subscription?.plan === "pro" ? "Pro" : subscription?.plan === "starter" ? "Starter" : subscription?.plan;
  const periodDate = isCancelScheduled ? cancelAtDate : subscription?.currentPeriodEnd ?? null;

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Text variant="h1">Configuration</Text>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
            Your business details, Google connection, and plan.
          </p>
        </div>

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800">Couldn&apos;t load your configuration: {error}</p>
            <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={() => load()}>
              Try again
            </Button>
          </div>
        ) : null}

        {loading ? (
          <ConfigurationSkeleton />
        ) : error ? null : !business ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Card className="w-full max-w-md text-center">
              <Text variant="h2">Let&apos;s set up your business</Text>
              <p className="mt-2 text-sm text-gray-500">
                You need to create a business before configuring your account.
              </p>
              <Button className="mt-6" onClick={() => router.push("/onboarding")}>
                Start setup
              </Button>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Business"
                  subtitle="Used in your replies and templates."
                  action={
                    <Button
                      variant="outline"
                      className="!w-auto shrink-0 px-4 py-2"
                      onClick={() => router.push("/onboarding")}
                    >
                      Edit
                    </Button>
                  }
                />
                <p className="mt-5 text-2xl font-bold tracking-tight text-gray-900">{business.name}</p>
                {business.email || business.phone ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {business.email ? (
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</p>
                        <p className="mt-1 truncate text-sm text-gray-900">{business.email}</p>
                      </div>
                    ) : null}
                    {business.phone ? (
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</p>
                        <p className="mt-1 text-sm text-gray-900 tabular-nums">{business.phone}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>

              <Card className="flex flex-col">
                <CardHeader
                  title="Google"
                  action={
                    business.google ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Not connected
                      </span>
                    )
                  }
                />
                <p className="mt-3 flex-1 text-sm text-gray-600">
                  {business.google
                    ? `Your Google Business Profile is connected since ${formatDate(business.google.createdAt)}.`
                    : "Connect your Google Business Profile so Respondly can sync and reply to reviews."}
                </p>
                <Button
                  className="mt-6 px-4 py-2"
                  variant={business.google ? "outline" : "primary"}
                  onClick={() => {
                    if (business.google) {
                      router.push("/google");
                    } else {
                      window.location.href = "/api/google/connect";
                    }
                  }}
                >
                  {business.google ? "Manage connection" : "Connect Google"}
                </Button>
              </Card>
            </div>

            {autoResponderEnabled !== null ? <AutoReplyCard initialEnabled={autoResponderEnabled} /> : null}

            {hasActiveSubscription ? (
              <PlanCard active>
                <CardHeader
                  title="Plan"
                  subtitle="You can change or cancel your subscription at any time."
                  action={
                    <Button
                      variant="outline"
                      className="!w-auto shrink-0 px-4 py-2"
                      onClick={() => router.push("/subscription")}
                    >
                      Manage
                    </Button>
                  }
                />
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-bold tracking-tight text-gray-900">{planName}</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClasses}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
                    {statusLabel}
                  </span>
                </div>
                {periodDate ? (
                  <p className="mt-1 text-sm text-gray-500">
                    {isCancelScheduled ? "Cancels on " : "Renews on "}
                    {formatDate(periodDate)}
                  </p>
                ) : null}
              </PlanCard>
            ) : (
              <PlanCard active={false}>
                <CardHeader
                  title="Plan"
                  subtitle="Choose a plan to turn on automatic replies and advanced features (AI in Pro)."
                />
                <div className="mt-5 max-w-md">
                  <Input
                    id="configurationInviteCode"
                    name="configurationInviteCode"
                    type="text"
                    label="Trial invite code (optional)"
                    placeholder="e.g. VIP90"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Use a VIP invite here for extended trial days. Stripe promotion codes stay on the Stripe checkout page.
                  </p>
                </div>
                <BillingPlans subscribing={subscribing} onSubscribe={subscribe} />
              </PlanCard>
            )}

            {canConfigureAi ? (
              <Card>
                <CardHeader
                  title="AI settings"
                  subtitle="The persona the AI uses when it writes your replies."
                  action={
                    <Button
                      className="!w-auto shrink-0 px-4 py-2"
                      onClick={saveAiSettings}
                      disabled={aiSaving || aiLoading}
                    >
                      {aiSaving ? "Saving..." : "Save"}
                    </Button>
                  }
                />

                {aiConfigured === false ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    OPENAI_API_KEY is not configured on the server. AI replies will not work until it is set.
                  </div>
                ) : null}

                {aiError ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{aiError}</div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Select
                    label="Tone"
                    value={aiSettings.tone}
                    onChange={(e) => setAiSettings((s) => ({ ...s, tone: e.target.value }))}
                  >
                    <option value="polite">Polite</option>
                    <option value="warm">Warm</option>
                  </Select>
                  <Input
                    label="Max length"
                    type="number"
                    value={aiSettings.maxLength}
                    onChange={(e) =>
                      setAiSettings((s) => ({
                        ...s,
                        maxLength: Number(e.target.value || 0),
                      }))
                    }
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      label="System prompt"
                      rows={7}
                      value={aiSettings.systemPrompt}
                      onChange={(e) => setAiSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
                    />
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
