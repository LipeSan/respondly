"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { PlanCard } from "@/components/PlanCard";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { BillingPlans } from "@/components/BillingPlans";
import { formatDate, formatDateTime } from "@/lib/date";

type Business = {
    id: string;
    name: string;
    subscription?: {
        plan: string;
        status: string;
        cancelAtPeriodEnd?: boolean;
        cancelAt?: string | null;
        currentPeriodEnd?: string | null;
    } | null;
};

type PaymentHistoryItem = {
    id: string;
    status: string;
    amount: number | null;
    currency: string | null;
    paidAt: string | null;
    createdAt: string;
    stripeEventType: string;
    stripeInvoiceId: string | null;
    stripePaymentIntentId: string | null;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
    lastEvent: null | {
        status: string;
        stripeEventType: string;
        createdAt: string;
    };
};

function formatMoney(amount: number | null, currency: string | null) {
    if (typeof amount !== "number") return "—";
    const ccy = (currency ?? "USD").toUpperCase();
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(amount / 100);
    } catch {
        return `${(amount / 100).toFixed(2)} ${ccy}`;
    }
}

const disputeStatuses = new Set([
    "needs_response",
    "warning_needs_response",
    "under_review",
    "warning_under_review",
    "warning_closed",
    "won",
    "lost",
    "dispute",
]);

function getPaymentStatus(status: string) {
    const isDispute = disputeStatuses.has(status);
    const classes =
        status === "paid"
            ? "bg-emerald-100 text-emerald-800"
            : status === "payment_failed"
                ? "bg-red-100 text-red-800"
                : status === "refunded"
                    ? "bg-gray-100 text-gray-800"
                    : isDispute && (status === "won" || status === "warning_closed")
                        ? "bg-gray-100 text-gray-800"
                        : isDispute && status === "lost"
                            ? "bg-red-100 text-red-800"
                            : isDispute && (status === "under_review" || status === "warning_under_review")
                                ? "bg-amber-100 text-amber-800"
                                : isDispute
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800";
    const labels: Record<string, string> = {
        payment_failed: "Payment failed",
        paid: "Paid",
        refunded: "Refunded",
        needs_response: "Dispute: needs response",
        warning_needs_response: "Dispute warning: needs response",
        under_review: "Dispute: under review",
        warning_under_review: "Dispute warning: under review",
        warning_closed: "Dispute warning: closed",
        won: "Dispute: won",
        lost: "Dispute: lost",
        dispute: "Dispute",
    };
    return { label: labels[status] ?? status, classes };
}

// Keep in sync with the real gates in src/lib/plan.ts (AI is Pro-only) and the
// cron schedule in vercel.json (reviews are synced and answered once a day).
const starterBenefits = [
    "Automatic replies to Google reviews",
    "Rules based on star rating",
    "Unlimited templates",
    "Manual mode to approve replies before posting",
    "New reviews checked and answered daily",
];

const proBenefits = [
    "Everything in Starter",
    "AI-written replies",
    "Custom AI tone, length and instructions",
];

function SubscriptionSkeleton() {
    return (
        <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading subscription">
            <div className="h-64 rounded-2xl bg-gray-100" />
            <div className="h-48 rounded-2xl bg-gray-100" />
        </div>
    );
}

export default function SubscriptionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<Business | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [subscribing, setSubscribing] = useState<null | "starter" | "pro">(null);
    const [showPlans, setShowPlans] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [inviteCode, setInviteCode] = useState("");

    const buildSubscriptionPath = () => {
        const params = new URLSearchParams();
        if (inviteCode.trim()) params.set("code", inviteCode.trim().toUpperCase());
        const query = params.toString();
        return query ? `/subscription?${query}` : "/subscription";
    };

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [res, historyRes] = await Promise.all([
                fetch("/api/businesses", { cache: "no-store" }),
                fetch("/api/billing/history?take=20&eventType=invoice.paid", { cache: "no-store" }),
            ]);

            if (res.status === 401 || historyRes.status === 401) {
                router.push(`/login?next=${encodeURIComponent(buildSubscriptionPath())}`);
                router.refresh();
                return;
            }

            const data = await res.json().catch(() => ({}));
            const historyData = await historyRes.json().catch(() => ({}));

            if (!res.ok) throw new Error(data?.error || "Failed to load subscription");
            const first = (data.businesses ?? [])[0] as Business | undefined;
            setBusiness(first ?? null);

            if (historyRes.ok) setPaymentHistory((historyData?.items ?? []) as PaymentHistoryItem[]);
            else setPaymentHistory([]);
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
        setInviteCode(String(searchParams.get("code") ?? "").trim().toUpperCase());
    }, [searchParams]);

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

            const data: { url?: string; error?: string } = await res.json().catch(() => ({} as { url?: string; error?: string }));
            if (res.status === 401) {
                router.push(`/login?next=${encodeURIComponent(buildSubscriptionPath())}`);
                router.refresh();
                return;
            }
            if (!res.ok) throw new Error(data?.error || "Failed to start checkout");

            if (!data?.url) throw new Error("Stripe checkout URL not returned");
            window.location.href = data.url;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            showToast({ type: "error", message: msg });
        } finally {
            setSubscribing(null);
        }
    }

    async function cancelSubscription() {
        if (!business?.subscription) {
            showToast({ type: "info", message: "There is no subscription to cancel." });
            return;
        }
        if (business.subscription.cancelAtPeriodEnd) {
            showToast({ type: "info", message: "Cancellation is already scheduled for this subscription." });
            return;
        }
        setCanceling(true);
        try {
            const res = await fetch("/api/billing/cancel", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Failed to cancel subscription");
            setConfirmCancelOpen(false);
            showToast({
                type: "success",
                message: "Your subscription will be canceled at the end of the current period.",
            });
            await load();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unexpected error";
            showToast({ type: "error", message: msg });
        } finally {
            setCanceling(false);
        }
    }

    const subscription = business?.subscription ?? null;
    const planLabel = subscription?.plan === "pro" ? "Pro" : subscription?.plan === "starter" ? "Starter" : "Free";
    const statusRaw = subscription?.status ?? "none";
    const cancelAt = subscription?.cancelAt ?? null;
    const cancelAtDate = cancelAt
        ? new Date(cancelAt)
        : subscription?.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : null;
    const isCancelScheduled = Boolean(subscription?.cancelAtPeriodEnd && statusRaw !== "canceled");
    const hasActiveSubscription = statusRaw === "active" || statusRaw === "trialing" || isCancelScheduled;

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

    const periodDate = isCancelScheduled ? cancelAtDate : subscription?.currentPeriodEnd ?? null;

    const isPro = hasActiveSubscription && subscription?.plan === "pro";
    const planBenefits = isPro ? proBenefits : starterBenefits;

    return (
        <div className="pb-12">
            <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <Text variant="h1">Manage subscription</Text>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
                            Your plan, renewal date, and billing history.
                        </p>
                    </div>
                    <Button variant="outline" className="!w-auto px-4 py-2" onClick={() => router.push("/configuration")}>
                        Back to configuration
                    </Button>
                </div>

                {error ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-red-800">Couldn&apos;t load your subscription: {error}</p>
                        <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={() => load()}>
                            Try again
                        </Button>
                    </div>
                ) : null}

                {loading ? (
                    <SubscriptionSkeleton />
                ) : error ? null : !business ? (
                    <div className="flex min-h-[50vh] items-center justify-center">
                        <Card className="w-full max-w-md text-center">
                            <Text variant="h2">Let&apos;s set up your business</Text>
                            <p className="mt-2 text-sm text-gray-500">
                                You need to create a business before managing your subscription.
                            </p>
                            <Button className="mt-6" onClick={() => router.push("/onboarding")}>
                                Start setup
                            </Button>
                        </Card>
                    </div>
                ) : (
                    <>
                        <PlanCard active={hasActiveSubscription}>
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-2xl font-bold tracking-tight text-gray-900">
                                        {planLabel === "Free" ? "Free plan" : `${planLabel} plan`}
                                    </p>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClasses}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
                                        {statusLabel}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                    {hasActiveSubscription
                                        ? `${business.name}${periodDate ? ` · ${isCancelScheduled ? "Ends on" : "Renews on"} ${formatDate(periodDate)}` : ""}`
                                        : "Subscribe to a plan to turn on automatic replies."}
                                </p>
                            </div>

                            <div className="mt-6 rounded-xl bg-white/70 p-5 backdrop-blur">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">What&apos;s included</p>
                                    {!isPro ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowPlans(true)}
                                            className="text-sm font-semibold text-green-700 transition-colors hover:text-green-800"
                                        >
                                            {hasActiveSubscription ? "Upgrade to Pro for AI replies →" : "See plans →"}
                                        </button>
                                    ) : null}
                                </div>
                                <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                    {planBenefits.map((benefit) => (
                                        <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-700">
                                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </PlanCard>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader title="Billing actions" subtitle="Changes are reflected in your account right away." />
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Button className="!w-auto px-4 py-2" onClick={() => setShowPlans((v) => !v)}>
                                        {showPlans ? "Hide plans" : "Change plan"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="!w-auto px-4 py-2"
                                        disabled={canceling || !subscription || isCancelScheduled || statusRaw === "canceled"}
                                        onClick={() => setConfirmCancelOpen(true)}
                                    >
                                        {canceling ? "Canceling..." : isCancelScheduled ? "Cancellation scheduled" : "Cancel subscription"}
                                    </Button>
                                </div>
                            </Card>

                            <Card>
                                <CardHeader
                                    title="Payment details"
                                    subtitle="Soon you'll be able to update your payment method from a secure Stripe portal. For now, reach out to support and we'll help with any changes."
                                />
                            </Card>
                        </div>

                        {showPlans ? (
                            <PlanCard active={false}>
                                <CardHeader
                                    title="Choose your plan"
                                    subtitle="You'll be redirected to a secure Stripe checkout."
                                />
                                <div className="mt-5 max-w-md">
                                    <Input
                                        id="subscriptionInviteCode"
                                        name="subscriptionInviteCode"
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
                                <BillingPlans
                                    subscribing={subscribing}
                                    onSubscribe={subscribe}
                                    currentPlan={subscription?.plan === "starter" || subscription?.plan === "pro" ? subscription.plan : null}
                                />
                            </PlanCard>
                        ) : null}

                        <Card>
                            <CardHeader title="Payment history" subtitle="Your latest invoices and payment events." />
                            {paymentHistory.length === 0 ? (
                                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
                                    <p className="text-sm font-medium text-gray-700">No payments yet</p>
                                    <p className="mt-1 max-w-xs text-sm text-gray-500">Invoices will appear here after your first charge.</p>
                                </div>
                            ) : (
                                <div className="-mx-6 mt-4 overflow-x-auto px-6">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <th className="py-2 pr-4 font-semibold">Date</th>
                                                <th className="py-2 pr-4 font-semibold">Status</th>
                                                <th className="py-2 pr-4 font-semibold">Amount</th>
                                                <th className="py-2 pr-4 font-semibold">Last update</th>
                                                <th className="py-2 font-semibold">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paymentHistory.map((p) => {
                                                const baseWhen = p.paidAt ?? p.createdAt;
                                                const latestWhen = p.lastEvent?.createdAt ?? baseWhen;
                                                const paymentStatus = getPaymentStatus(p.lastEvent?.status ?? p.status);
                                                const link = p.hostedInvoiceUrl ?? p.invoicePdf;

                                                return (
                                                    <tr key={p.id} className="text-gray-700">
                                                        <td className="whitespace-nowrap py-3 pr-4">{formatDateTime(baseWhen)}</td>
                                                        <td className="whitespace-nowrap py-3 pr-4">
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatus.classes}`}>
                                                                {paymentStatus.label}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap py-3 pr-4 font-medium text-gray-900 tabular-nums">
                                                            {formatMoney(p.amount, p.currency)}
                                                        </td>
                                                        <td className="whitespace-nowrap py-3 pr-4">
                                                            {p.lastEvent ? (
                                                                <div className="flex flex-col">
                                                                    <span>{formatDateTime(latestWhen)}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {p.lastEvent.status} · {p.lastEvent.stripeEventType}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap py-3">
                                                            {link ? (
                                                                <a
                                                                    href={link}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="font-semibold text-blue-600 hover:text-blue-500"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : p.stripeInvoiceId ? (
                                                                <span className="text-gray-500">{p.stripeInvoiceId}</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </>
                )}

                <Modal
                    open={confirmCancelOpen}
                    onClose={() => {
                        if (!canceling) setConfirmCancelOpen(false);
                    }}
                    title="Confirm cancellation"
                    footer={
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="!w-auto"
                                onClick={() => setConfirmCancelOpen(false)}
                                disabled={canceling}
                            >
                                Keep subscription
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                className="!w-auto"
                                onClick={cancelSubscription}
                                isLoading={canceling}
                                disabled={canceling}
                            >
                                Confirm cancellation
                            </Button>
                        </div>
                    }
                >
                    <Text variant="body" className="text-sm text-gray-700">
                        Your subscription will remain active until the end of the current billing period.
                    </Text>
                    {cancelAtDate ? (
                        <Text variant="body" className="mt-3 text-sm font-semibold text-gray-900">
                            Access ends on {formatDate(cancelAtDate)}.
                        </Text>
                    ) : null}
                    <Text variant="body" className="mt-3 text-sm text-gray-600">
                        After confirming, the cancellation will be scheduled in Stripe and your current plan will not renew automatically.
                    </Text>
                </Modal>
            </main>
        </div>
    );
}
