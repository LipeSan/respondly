"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";
import { BillingPlans } from "@/components/BillingPlans";

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

export default function SubscriptionPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState<Business | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [subscribing, setSubscribing] = useState<null | "starter" | "pro">(null);
    const [showPlans, setShowPlans] = useState(false);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [res, historyRes] = await Promise.all([
                fetch("/api/businesses", { cache: "no-store" }),
                fetch("/api/billing/history?take=20&eventType=invoice.paid", { cache: "no-store" }),
            ]);

            if (res.status === 401 || historyRes.status === 401) {
                router.push("/login");
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

    async function subscribe(plan: "starter" | "pro") {
        try {
            setSubscribing(plan);
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });

            const data: { url?: string; error?: string } = await res.json().catch(() => ({} as { url?: string; error?: string }));
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <Text variant="body" className="font-medium">Loading subscription...</Text>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <Text variant="subtitle" className="mb-2 font-bold text-gray-900">Error loading subscription</Text>
                    <Text variant="body" className="mb-6">{error}</Text>
                    <div className="flex justify-center gap-3">
                        <Button onClick={() => load()}>
                            Try again
                        </Button>
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>
                            Back to dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                    </div>
                    <Text variant="h2" className="mb-2">No business found</Text>
                    <Text variant="body" className="mb-8">
                        You need to create a business before managing your subscription.
                    </Text>
                    <Button onClick={() => router.push("/onboarding")}>
                        Go to Onboarding
                    </Button>
                </div>
            </div>
        );
    }

    const subscription = business.subscription;
    const planLabel = subscription?.plan === "pro" ? "Pro" : subscription?.plan === "starter" ? "Starter" : "Free";
    const statusRaw = subscription?.status ?? "none";
    const cancelAt = subscription?.cancelAt ?? null;
    const cancelAtDate = cancelAt
        ? new Date(cancelAt)
        : subscription?.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : null;
    const isCancelScheduled = Boolean(subscription?.cancelAtPeriodEnd && statusRaw !== "canceled");

    let statusLabel = "No active subscription";
    let badgeClasses = "bg-gray-100 border-gray-200 text-gray-700";
    let dotClasses = "bg-gray-400";

    if (statusRaw === "active") {
        statusLabel = "Active";
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

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <Text variant="h1">Manage subscription</Text>
                        <Text variant="subtitle" className="mt-2">
                            Review your current plan, renewal date, and billing status.
                        </Text>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="!w-auto"
                            onClick={() => router.push("/dashboard")}
                        >
                            Back to dashboard
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:col-span-2">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}>
                                    <span className={`w-2 h-2 rounded-full animate-pulse ${dotClasses}`} />
                                    <span>{statusLabel}</span>
                                </div>
                                <Text variant="h2" className="mt-3 text-xl font-bold text-gray-900">
                                    {planLabel === "Free" ? "Free plan" : `${planLabel} plan`}
                                </Text>
                                <Text variant="body" className="mt-1 text-sm text-gray-600">
                                    {business.name}
                                </Text>
                                {(isCancelScheduled ? cancelAtDate : subscription?.currentPeriodEnd) && (
                                    <Text variant="body" className="mt-1 text-xs text-gray-500">
                                        {isCancelScheduled ? "Cancels on " : "Renews on "}
                                        {(cancelAtDate ?? new Date(subscription?.currentPeriodEnd as string)).toLocaleDateString()}
                                    </Text>
                                )}
                            </div>

                            <div className="hidden md:flex flex-col items-end gap-2">
                                <Text variant="body" className="text-xs text-gray-500">
                                    Stripe secures all payments and subscriptions.
                                </Text>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <Text variant="label" className="text-xs text-gray-500">Plan</Text>
                                <Text variant="body" className="mt-1 font-semibold text-gray-900">
                                    {planLabel}
                                </Text>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <Text variant="label" className="text-xs text-gray-500">Status</Text>
                                <Text variant="body" className="mt-1 font-semibold text-gray-900">
                                    {statusLabel}
                                </Text>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <Text variant="label" className="text-xs text-gray-500">{isCancelScheduled ? "Ends on" : "Next renewal"}</Text>
                                <Text variant="body" className="mt-1 font-semibold text-gray-900">
                                    {isCancelScheduled
                                        ? cancelAtDate
                                            ? cancelAtDate.toLocaleDateString()
                                            : "Not scheduled"
                                        : subscription?.currentPeriodEnd
                                            ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                        : "Not scheduled"}
                                </Text>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col justify-between">
                        <div>
                            <Text variant="subtitle" className="font-bold text-gray-900">Plan benefits</Text>
                            <Text variant="body" className="mt-2 text-sm text-gray-600">
                                See what is included in your subscription so you can choose the best plan for your business.
                            </Text>

                            <ul className="mt-4 text-sm text-gray-700 space-y-1">
                                <li>• Automatic replies to Google reviews</li>
                                <li>• Smart rules based on star rating</li>
                                <li>• Unlimited templates</li>
                                <li>• 24/7 automation</li>
                                <li>• AI-powered responses in Pro</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <Text variant="subtitle" className="font-bold text-gray-900">Payment history</Text>
                    <Text variant="body" className="mt-2 text-sm text-gray-600">
                        Your latest invoices and payment events.
                    </Text>

                    <div className="mt-4 overflow-x-auto">
                        {paymentHistory.length === 0 ? (
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                <Text variant="body" className="text-sm text-gray-700">
                                    No payment history yet.
                                </Text>
                            </div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500">
                                        <th className="py-2 pr-4 font-semibold">Date</th>
                                        <th className="py-2 pr-4 font-semibold">Status</th>
                                        <th className="py-2 pr-4 font-semibold">Amount</th>
                                        <th className="py-2 pr-4 font-semibold">Last update</th>
                                        <th className="py-2 pr-4 font-semibold">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paymentHistory.map((p) => {
                                        const baseWhen = p.paidAt ?? p.createdAt;
                                        const latestWhen = p.lastEvent?.createdAt ?? baseWhen;
                                        const status = p.lastEvent?.status ?? p.status;
                                        const link = p.hostedInvoiceUrl ?? p.invoicePdf;
                                        const isDispute =
                                            status === "needs_response" ||
                                            status === "warning_needs_response" ||
                                            status === "under_review" ||
                                            status === "warning_under_review" ||
                                            status === "warning_closed" ||
                                            status === "won" ||
                                            status === "lost" ||
                                            status === "dispute";
                                        const badge =
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
                                        const statusLabel =
                                            status === "payment_failed"
                                                ? "Payment failed"
                                                : status === "paid"
                                                    ? "Paid"
                                                    : status === "refunded"
                                                        ? "Refunded"
                                            : status === "needs_response"
                                                ? "Dispute: needs response"
                                            : status === "warning_needs_response"
                                                ? "Dispute warning: needs response"
                                            : status === "under_review"
                                                ? "Dispute: under review"
                                            : status === "warning_under_review"
                                                ? "Dispute warning: under review"
                                            : status === "warning_closed"
                                                ? "Dispute warning: closed"
                                            : status === "won"
                                                ? "Dispute: won"
                                            : status === "lost"
                                                ? "Dispute: lost"
                                            : status === "dispute"
                                                ? "Dispute"
                                                        : status;

                                        return (
                                            <tr key={p.id} className="text-gray-700">
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {new Date(baseWhen).toLocaleString()}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {formatMoney(p.amount, p.currency)}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {p.lastEvent ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-700">
                                                                {new Date(latestWhen).toLocaleString()}
                                                            </span>
                                                            <span className="text-gray-500 text-xs">
                                                                {p.lastEvent.status} · {p.lastEvent.stripeEventType}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {link ? (
                                                        <a
                                                            href={link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-700 underline underline-offset-2"
                                                        >
                                                            View
                                                        </a>
                                                    ) : p.stripeInvoiceId ? (
                                                        <span className="text-gray-500">{p.stripeInvoiceId}</span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <Text variant="subtitle" className="font-bold text-gray-900">Billing actions</Text>
                        <Text variant="body" className="mt-2 text-sm text-gray-600">
                            Manage your subscription lifecycle. Changes will be reflected immediately in your account.
                        </Text>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                                variant="primary"
                                className="!w-auto"
                                onClick={() => setShowPlans((v) => !v)}
                            >
                                {showPlans ? "Hide plans" : "Change plan"}
                            </Button>
                            <Button
                                variant="outline"
                                className="!w-auto"
                                disabled={canceling || !subscription || isCancelScheduled || statusRaw === "canceled"}
                                onClick={cancelSubscription}
                            >
                                {canceling ? "Canceling..." : isCancelScheduled ? "Cancellation scheduled" : "Cancel subscription"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                        <Text variant="subtitle" className="font-bold text-gray-900">Need to update payment details?</Text>
                        <Text variant="body" className="mt-2 text-sm text-gray-600">
                            Soon you will be able to update your payment method directly from a secure Stripe portal.
                            For now, reach out to support and we will help you with any changes.
                        </Text>
                    </div>
                </div>

                {showPlans && (
                    <div className="mt-6">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                            <Text variant="subtitle" className="font-bold text-gray-900">Choose your plan</Text>
                            <Text variant="body" className="mt-2 text-sm text-gray-600">
                                Select a new plan below. You will be redirected to a secure Stripe checkout.
                            </Text>
                            <BillingPlans
                                subscribing={subscribing}
                                onSubscribe={subscribe}
                                currentPlan={subscription?.plan === "starter" || subscription?.plan === "pro" ? subscription.plan : null}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
