import { notFound, redirect } from "next/navigation";
import { Text } from "@/components/Text";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser, getAdminImpersonatedBusinessId } from "@/lib/admin";
import { AdminBusinessActions } from "./AdminBusinessActions";

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number") return "—";
  const normalized = amount / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency ?? "USD").toUpperCase(),
    }).format(normalized);
  } catch {
    return `${normalized.toFixed(2)} ${(currency ?? "usd").toUpperCase()}`;
  }
}

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      timezone: true,
      createdAt: true,
      autoResponderEnabled: true,
      initialSyncCompleted: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          trialUsedAt: true,
          cancelAt: true,
          cancelAtPeriodEnd: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      },
      google: {
        select: {
          id: true,
          locationId: true,
          createdAt: true,
          expiresAt: true,
        },
      },
      templates: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          body: true,
          createdAt: true,
        },
      },
      rules: {
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        take: 10,
        select: {
          id: true,
          priority: true,
          minStars: true,
          maxStars: true,
          mode: true,
          responseType: true,
          createdAt: true,
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          authorName: true,
          comment: true,
          status: true,
          createdAt: true,
        },
      },
      paymentHistory: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          stripeEventType: true,
          status: true,
          amount: true,
          currency: true,
          paidAt: true,
          createdAt: true,
          hostedInvoiceUrl: true,
          invoicePdf: true,
        },
      },
      adminAuditLogs: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          templates: true,
          rules: true,
          reviews: true,
          paymentHistory: true,
        },
      },
    },
  });

  if (!business) notFound();

  const impersonatedBusinessId = await getAdminImpersonatedBusinessId();
  const isCurrent = impersonatedBusinessId === business.id;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <Text variant="h1">{business.name}</Text>
          <Text variant="subtitle" className="mt-2">
            Review customer account health, billing state, automation setup, and jump into the client workspace when you need to make changes.
          </Text>
        </div>
        <AdminBusinessActions businessId={business.id} isCurrent={isCurrent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Owner
          </Text>
          <Text variant="h2" className="mt-2 text-xl">
            {business.user.name || business.user.email}
          </Text>
          <Text variant="body" className="mt-2 text-sm text-gray-600">
            {business.user.email} · {business.user.role}
          </Text>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Subscription
          </Text>
          <Text variant="h2" className="mt-2 text-xl">
            {business.subscription ? `${business.subscription.plan} · ${business.subscription.status}` : "No plan"}
          </Text>
          <Text variant="body" className="mt-2 text-sm text-gray-600">
            Trial ends: {formatDate(business.subscription?.trialEndsAt)}
          </Text>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Automation
          </Text>
          <Text variant="h2" className="mt-2 text-xl">
            {business.autoResponderEnabled ? "Enabled" : "Disabled"}
          </Text>
          <Text variant="body" className="mt-2 text-sm text-gray-600">
            Initial sync: {business.initialSyncCompleted ? "Completed" : "Pending"}
          </Text>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text variant="body" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Google
          </Text>
          <Text variant="h2" className="mt-2 text-xl">
            {business.google ? "Connected" : "Not connected"}
          </Text>
          <Text variant="body" className="mt-2 text-sm text-gray-600">
            Location: {business.google?.locationId || "—"}
          </Text>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Account Details
            </Text>
            <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
              <div><span className="font-semibold text-gray-900">Business email:</span> {business.email || "—"}</div>
              <div><span className="font-semibold text-gray-900">Business phone:</span> {business.phone || "—"}</div>
              <div><span className="font-semibold text-gray-900">Timezone:</span> {business.timezone}</div>
              <div><span className="font-semibold text-gray-900">Created:</span> {formatDate(business.createdAt)}</div>
              <div><span className="font-semibold text-gray-900">Owner created:</span> {formatDate(business.user.createdAt)}</div>
              <div><span className="font-semibold text-gray-900">Current impersonation:</span> {isCurrent ? "Active" : "Inactive"}</div>
              <div><span className="font-semibold text-gray-900">Templates:</span> {business._count.templates}</div>
              <div><span className="font-semibold text-gray-900">Rules:</span> {business._count.rules}</div>
              <div><span className="font-semibold text-gray-900">Reviews:</span> {business._count.reviews}</div>
              <div><span className="font-semibold text-gray-900">Billing events:</span> {business._count.paymentHistory}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Billing Overview
            </Text>
            <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
              <div><span className="font-semibold text-gray-900">Plan:</span> {business.subscription?.plan || "—"}</div>
              <div><span className="font-semibold text-gray-900">Status:</span> {business.subscription?.status || "—"}</div>
              <div><span className="font-semibold text-gray-900">Current period end:</span> {formatDate(business.subscription?.currentPeriodEnd)}</div>
              <div><span className="font-semibold text-gray-900">Trial used at:</span> {formatDate(business.subscription?.trialUsedAt)}</div>
              <div><span className="font-semibold text-gray-900">Cancel at period end:</span> {business.subscription?.cancelAtPeriodEnd ? "Yes" : "No"}</div>
              <div><span className="font-semibold text-gray-900">Cancel at:</span> {formatDate(business.subscription?.cancelAt)}</div>
              <div><span className="font-semibold text-gray-900">Stripe customer:</span> {business.subscription?.stripeCustomerId || "—"}</div>
              <div><span className="font-semibold text-gray-900">Stripe subscription:</span> {business.subscription?.stripeSubscriptionId || "—"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Text variant="h2" className="text-xl">
                  Templates
                </Text>
                <Text variant="body" className="mt-1 text-sm text-gray-600">
                  Latest message templates configured for this client.
                </Text>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {business.templates.length === 0 ? (
                <div className="text-sm text-gray-600">No templates configured yet.</div>
              ) : (
                business.templates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <Text variant="body" className="font-semibold text-gray-900">
                        {template.name}
                      </Text>
                      <Text variant="body" className="text-xs text-gray-500">
                        {formatDate(template.createdAt)}
                      </Text>
                    </div>
                    <Text variant="body" className="mt-2 text-sm text-gray-600">
                      {template.body}
                    </Text>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Rules
            </Text>
            <div className="mt-4 space-y-3">
              {business.rules.length === 0 ? (
                <div className="text-sm text-gray-600">No rules configured yet.</div>
              ) : (
                business.rules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Text variant="body" className="font-semibold text-gray-900">
                        Priority {rule.priority} · {rule.responseType}
                      </Text>
                      <Text variant="body" className="text-xs text-gray-500">
                        {formatDate(rule.createdAt)}
                      </Text>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                      <div><span className="font-semibold text-gray-900">Stars:</span> {rule.minStars ?? "—"} to {rule.maxStars ?? "—"}</div>
                      <div><span className="font-semibold text-gray-900">Mode:</span> {rule.mode}</div>
                      <div><span className="font-semibold text-gray-900">Template:</span> {rule.template?.name || "—"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Recent Billing Events
            </Text>
            <div className="mt-4 space-y-3">
              {business.paymentHistory.length === 0 ? (
                <div className="text-sm text-gray-600">No billing events recorded yet.</div>
              ) : (
                business.paymentHistory.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Text variant="body" className="font-semibold text-gray-900">
                        {event.status}
                      </Text>
                      <Text variant="body" className="text-xs text-gray-500">
                        {formatDate(event.createdAt)}
                      </Text>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-gray-600">
                      <div><span className="font-semibold text-gray-900">Event:</span> {event.stripeEventType}</div>
                      <div><span className="font-semibold text-gray-900">Amount:</span> {formatMoney(event.amount, event.currency)}</div>
                      <div><span className="font-semibold text-gray-900">Paid at:</span> {formatDate(event.paidAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Recent Reviews
            </Text>
            <div className="mt-4 space-y-3">
              {business.reviews.length === 0 ? (
                <div className="text-sm text-gray-600">No reviews available.</div>
              ) : (
                business.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Text variant="body" className="font-semibold text-gray-900">
                        {review.rating} stars · {review.status}
                      </Text>
                      <Text variant="body" className="text-xs text-gray-500">
                        {formatDate(review.createdAt)}
                      </Text>
                    </div>
                    <Text variant="body" className="mt-2 text-sm text-gray-600">
                      {review.authorName || "Anonymous"}{review.comment ? ` — ${review.comment}` : ""}
                    </Text>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text variant="h2" className="text-xl">
              Audit Trail
            </Text>
            <div className="mt-4 space-y-3">
              {business.adminAuditLogs.length === 0 ? (
                <div className="text-sm text-gray-600">No audit events for this client yet.</div>
              ) : (
                business.adminAuditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Text variant="body" className="font-semibold text-gray-900">
                        {log.action}
                      </Text>
                      <Text variant="body" className="text-xs text-gray-500">
                        {formatDate(log.createdAt)}
                      </Text>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-gray-600">
                      <div><span className="font-semibold text-gray-900">Actor:</span> {log.actorUser.name || log.actorUser.email} ({log.actorUser.role})</div>
                      <div><span className="font-semibold text-gray-900">Target user:</span> {log.targetUser ? `${log.targetUser.name || log.targetUser.email} (${log.targetUser.role})` : "—"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
