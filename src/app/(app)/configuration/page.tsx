"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";
import { Textarea } from "@/components/Textarea";
import { BillingPlans } from "@/components/BillingPlans";
import { AutoReplyCard } from "@/components/AutoReplyCard";
import { useToast } from "@/components/Toast";

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
        router.push("/login");
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
        body: JSON.stringify({ plan }),
      });

      const data: { url?: string; error?: string } = await res
        .json()
        .catch(() => ({} as { url?: string; error?: string }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <Text variant="body" className="font-medium">
            Loading configuration...
          </Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
          </div>
          <Text variant="subtitle" className="mb-2 font-bold text-gray-900">
            Error loading
          </Text>
          <Text variant="body" className="mb-6">
            {error}
          </Text>
          <Button onClick={() => load()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              ></path>
            </svg>
          </div>
          <Text variant="h2" className="mb-2">
            No business yet
          </Text>
          <Text variant="body" className="mb-8">
            You need to create a business before configuring your account.
          </Text>
          <Button onClick={() => router.push("/onboarding")}>Go to Onboarding</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Text variant="h1">Configuration</Text>
            <Text variant="subtitle" className="mt-2">
              Manage your business details, Google connection, and plan.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:col-span-2 hover:shadow-2xl transition-shadow duration-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    ></path>
                  </svg>
                </div>
                <Text variant="subtitle" className="font-bold text-gray-900">
                  Your Business
                </Text>
              </div>

              <Button
                variant="outline"
                className="!w-auto inline-flex items-center px-4 py-2"
                onClick={() => router.push("/onboarding")}
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Business
              </Button>
            </div>

            <div className="space-y-3">
              <Text variant="h2" className="text-2xl font-bold text-gray-900">
                {business.name}
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {business.email && (
                  <div className="flex items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <Text variant="body" className="truncate">
                      {business.email}
                    </Text>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      ></path>
                    </svg>
                    <Text variant="body">{business.phone}</Text>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    business.google ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${
                      business.google ? "text-green-600" : "text-gray-400"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                </div>
                <Text variant="subtitle" className="font-bold text-gray-900">
                  Google
                </Text>
              </div>

              {business.google ? (
                <>
                  <Text
                    variant="h2"
                    className="mt-1 text-lg font-semibold text-green-600"
                  >
                    Connected
                  </Text>
                  <Text
                    variant="body"
                    className="mt-2 text-sm text-gray-600"
                  >
                    Your Google Business Profile is connected and active.
                  </Text>
                </>
              ) : (
                <>
                  <Text variant="h2" className="mt-1 text-lg font-semibold text-gray-900">
                    Disconnected
                  </Text>
                  <Text variant="body" className="mt-2 text-sm text-gray-600">
                    Next step: connect Google Business Profile to manage reviews.
                  </Text>
                </>
              )}
            </div>

            <Button
              className="mt-6"
              variant={business.google ? "outline" : "primary"}
              onClick={() => {
                if (business.google) {
                  router.push("/google");
                } else {
                  window.location.href = "/api/google/connect";
                }
              }}
            >
              {business.google ? "Manage Connection" : "Connect Google"}
            </Button>
          </div>
        </div>

        {autoResponderEnabled !== null && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-3">
              <AutoReplyCard initialEnabled={autoResponderEnabled} />
            </div>
          </div>
        )}

        {hasActiveSubscription ? (
          <div className="mt-6">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 shadow-xl px-6 py-5 md:px-8 md:py-6">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl" />
              <div className="absolute -left-4 -bottom-8 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${badgeClasses}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${dotClasses}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {statusLabel}
                    </span>
                  </div>
                  <Text variant="h2" className="mt-3 text-xl font-bold text-gray-900">
                    Plan{" "}
                    {subscription?.plan === "pro"
                      ? "Pro"
                      : subscription?.plan === "starter"
                        ? "Starter"
                        : subscription?.plan}
                  </Text>
                  {(isCancelScheduled ? cancelAtDate : subscription?.currentPeriodEnd) && (
                    <Text variant="body" className="mt-1 text-xs text-gray-600">
                      {isCancelScheduled ? "Cancels on " : "Renews on "}
                      {(
                        isCancelScheduled
                          ? cancelAtDate
                          : subscription?.currentPeriodEnd
                            ? new Date(subscription.currentPeriodEnd)
                            : null
                      )?.toLocaleDateString()}
                    </Text>
                  )}
                  <Text variant="body" className="mt-3 text-sm text-gray-700 max-w-xl">
                    You can change or cancel your subscription at any time.
                  </Text>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <Button
                    variant="ghost"
                    className="bg-white/70 backdrop-blur px-4 py-2 hover:bg-white"
                    onClick={() => router.push("/subscription")}
                  >
                    Manage subscription
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-200 md:col-span-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 1.343-3 3v1h6v-1c0-1.657-1.343-3-3-3z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 11v-1a5 5 0 0110 0v1"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 11h12v10H6z"
                    />
                  </svg>
                </div>
                <Text variant="subtitle" className="font-bold text-gray-900">
                  Plan
                </Text>
              </div>

              <Text variant="body" className="text-sm text-gray-600 mt-2">
                Choose a plan to enable automations and advanced features (AI in Pro).
              </Text>

              <BillingPlans subscribing={subscribing} onSubscribe={subscribe} />
            </div>
          </div>
        )}

        {canConfigureAi && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Text variant="subtitle" className="font-bold text-gray-900">
                    AI settings (Pro)
                  </Text>
                  <Text variant="body" className="mt-2 text-sm text-gray-600">
                    Configure the AI persona (role) used to generate automatic replies.
                  </Text>
                </div>
                <Button
                  className="!w-auto"
                  onClick={saveAiSettings}
                  disabled={aiSaving || aiLoading}
                >
                  {aiSaving ? "Saving..." : "Save"}
                </Button>
              </div>

              {aiConfigured === false && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
                  OPENAI_API_KEY is not configured on the server. AI replies will not work until it is set.
                </div>
              )}

              {aiError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                  {aiError}
                </div>
              )}

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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
