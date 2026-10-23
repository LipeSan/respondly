import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser, getAdminImpersonatedBusinessId } from "@/lib/admin";
import { loadBusinessHealthRows } from "@/lib/adminData";
import { formatAdminDate, formatAdminDateTime } from "@/lib/date";
import { getOnboardingStage } from "@/lib/email/adminEmailPresets";
import { automatedReviewsWhere, isBeforeAutomation } from "@/lib/reviews/automationWindow";
import { Badge, Card, CardHeader, HealthDot, formatAuditAction, formatRelative, planBadge } from "../../ui";
import { AdminBusinessActions } from "./AdminBusinessActions";
import { AdminOwnerRole } from "./AdminOwnerRole";

export const dynamic = "force-dynamic";

function formatMoney(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number") return "—";
  const normalized = amount / 100;
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: (currency ?? "AUD").toUpperCase(),
    }).format(normalized);
  } catch {
    return `${normalized.toFixed(2)} ${(currency ?? "aud").toUpperCase()}`;
  }
}

type CheckState = "ok" | "warning" | "error";

function ChecklistRow({ state, label, detail }: { state: CheckState; label: string; detail?: string }) {
  const icon = {
    ok: { symbol: "✓", classes: "bg-emerald-100 text-emerald-700" },
    warning: { symbol: "!", classes: "bg-amber-100 text-amber-700" },
    error: { symbol: "✕", classes: "bg-red-100 text-red-700" },
  }[state];
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${icon.classes}`}
        aria-hidden="true"
      >
        {icon.symbol}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {detail ? <p className="text-xs text-gray-500">{detail}</p> : null}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 tabular-nums">{value}</p>
    </Card>
  );
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
      connectedAt: true,
      user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          cancelAt: true,
          cancelAtPeriodEnd: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      },
      templates: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, body: true, createdAt: true },
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
          template: { select: { name: true } },
        },
      },
      reviews: {
        orderBy: [{ createdAtGoogle: { sort: "desc", nulls: "last" } }, { id: "desc" }],
        take: 8,
        select: { id: true, rating: true, authorName: true, comment: true, status: true, createdAt: true, createdAtGoogle: true },
      },
      paymentHistory: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, stripeEventType: true, status: true, amount: true, currency: true, createdAt: true, hostedInvoiceUrl: true },
      },
      jobRuns: {
        orderBy: { startedAt: "desc" },
        take: 10,
        select: { id: true, type: true, status: true, startedAt: true, processed: true, responded: true, error: true },
      },
      adminAuditLogs: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          actorUser: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!business) notFound();

  const [[health], reviewStats, repliedCount, awaitingCount, impersonatedBusinessId] = await Promise.all([
    loadBusinessHealthRows({ where: { id } }),
    prisma.review.aggregate({ where: { businessId: id }, _count: true, _avg: { rating: true } }),
    prisma.review.count({ where: { businessId: id, status: "responded" } }),
    prisma.review.count({ where: { AND: [{ businessId: id, status: "pending" }, automatedReviewsWhere(business.connectedAt)] } }),
    getAdminImpersonatedBusinessId(),
  ]);

  const isCurrent = impersonatedBusinessId === business.id;
  const plan = planBadge(business.subscription?.plan, business.subscription?.status);
  const issueCodes = new Set(health.issues.map((i) => i.code));
  const sub = business.subscription;

  const checklist: Array<{ state: CheckState; label: string; detail?: string }> = [
    { state: "ok", label: "Account created", detail: `${business.user.email} · ${formatAdminDate(business.user.createdAt)}` },
    {
      state: health.googleConnected ? "ok" : "error",
      label: health.googleConnected ? "Google connected" : "Google not connected",
      detail: business.connectedAt ? `First sync ${formatAdminDate(business.connectedAt)}` : undefined,
    },
    {
      state: health.locationSelected ? "ok" : health.googleConnected ? "error" : "warning",
      label: health.locationSelected ? "Location selected" : "No location selected",
    },
    {
      state: !sub ? "warning" : issueCodes.has("billing_problem") ? "error" : health.paying ? "ok" : "warning",
      label: !sub ? "No plan" : `${plan.label}`,
      detail: sub
        ? sub.status === "trialing"
          ? `Trial ends ${formatAdminDate(sub.trialEndsAt)}`
          : sub.cancelAtPeriodEnd
            ? `Cancels ${formatAdminDate(sub.cancelAt ?? sub.currentPeriodEnd)}`
            : `Renews ${formatAdminDate(sub.currentPeriodEnd)}`
        : undefined,
    },
    {
      state: health.autoResponderEnabled ? "ok" : health.paying ? "error" : "warning",
      label: health.autoResponderEnabled ? "Auto-replies on" : "Auto-replies off",
    },
    {
      state: issueCodes.has("sync_failed") || issueCodes.has("sync_stale") ? "error" : health.lastSync ? "ok" : "warning",
      label: health.lastSync
        ? `Last sync ${formatRelative(health.lastSync.at)}${health.lastSync.status === "failed" ? " (failed)" : ""}`
        : "Never synced",
      detail: health.lastSync ? formatAdminDateTime(health.lastSync.at) : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Customers
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <HealthDot level={health.health} />
              <h1 className="text-3xl font-bold tracking-tight text-gray-800">{business.name}</h1>
              <Badge tone={plan.tone}>{plan.label}</Badge>
              {isCurrent ? <Badge tone="blue">Open now</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {business.user.name ? `${business.user.name} · ` : ""}
              {business.user.email} · customer since {formatAdminDate(business.createdAt)}
            </p>
          </div>
          <AdminBusinessActions
            businessId={business.id}
            isCurrent={isCurrent}
            emailRecipient={
              adminContext.accessLevel === "admin"
                ? {
                    userId: business.user.id,
                    name: business.user.name,
                    email: business.user.email,
                    stage: getOnboardingStage({
                      hasBusiness: true,
                      hasGoogle: health.googleConnected,
                      hasSubscription: Boolean(business.subscription),
                    }),
                  }
                : null
            }
          />
        </div>
      </div>

      {health.issues.length > 0 ? (
        <div
          className={`rounded-2xl border p-4 ${
            health.health === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className={`text-sm font-semibold ${health.health === "critical" ? "text-red-900" : "text-amber-900"}`}>
            {health.issues.length === 1 ? "1 issue" : `${health.issues.length} issues`} need attention
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {health.issues.map((issue) => (
              <Badge key={issue.code} tone={issue.severity === "critical" ? "red" : "amber"}>
                {issue.label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Reviews" value={String(reviewStats._count)} />
        <Stat label="Replied" value={String(repliedCount)} />
        <Stat label="Waiting for automation" value={String(awaitingCount)} />
        <Stat
          label="Average rating"
          value={reviewStats._avg.rating === null ? "—" : `${reviewStats._avg.rating.toFixed(1)} / 5`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Setup checklist" subtitle="Everything that must be in place for automation to work." />
            <ul className="mt-2 divide-y divide-gray-100">
              {checklist.map((item) => (
                <ChecklistRow key={item.label} {...item} />
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Recent jobs"
              subtitle="Review syncs and auto-reply runs."
              action={
                <Link href={`/admin/jobs?business=${business.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                  All jobs
                </Link>
              }
            />
            <ul className="mt-3 divide-y divide-gray-100">
              {business.jobRuns.length === 0 ? (
                <li className="py-6 text-center text-sm text-gray-500">No jobs have run for this business.</li>
              ) : (
                business.jobRuns.map((job) => (
                  <li key={job.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900">
                        {job.type === "sync_reviews" ? "Review sync" : "Auto-replies"}
                        <span className="text-gray-500">
                          {job.type === "sync_reviews"
                            ? ` · ${job.processed} reviews`
                            : ` · ${job.responded} replied of ${job.processed}`}
                        </span>
                      </p>
                      {job.error ? <p className="mt-0.5 line-clamp-2 text-xs text-red-600">{job.error}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={job.status === "success" ? "green" : job.status === "failed" ? "red" : "amber"}>
                        {job.status}
                      </Badge>
                      <span className="text-xs text-gray-400" title={formatAdminDateTime(job.startedAt)}>
                        {formatRelative(job.startedAt)}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Latest reviews"
              subtitle={
                business.connectedAt
                  ? `Reviews posted before ${formatAdminDate(business.connectedAt)} aren't answered automatically.`
                  : undefined
              }
            />
            <ul className="mt-3 divide-y divide-gray-100">
              {business.reviews.length === 0 ? (
                <li className="py-6 text-center text-sm text-gray-500">No reviews synced yet.</li>
              ) : (
                business.reviews.map((review) => {
                  const notAutomated = isBeforeAutomation(review, business.connectedAt);
                  return (
                  <li key={review.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-900">
                        <span className="text-yellow-500">{"★".repeat(review.rating)}</span>
                        <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>{" "}
                        <span className="font-medium">{review.authorName || "Anonymous"}</span>
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        {notAutomated ? (
                          <Badge>Not automated</Badge>
                        ) : (
                          <Badge
                            tone={
                              review.status === "responded" ? "green" : review.status === "failed" ? "red" : review.status === "pending" ? "amber" : "gray"
                            }
                          >
                            {review.status}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">{formatAdminDate(review.createdAtGoogle ?? review.createdAt)}</span>
                      </div>
                    </div>
                    {review.comment ? <p className="mt-1 line-clamp-2 text-gray-600">{review.comment}</p> : null}
                  </li>
                  );
                })
              )}
            </ul>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer list-none">
                <CardHeader
                  title="Automation setup"
                  subtitle={`${business.rules.length} rules · ${business.templates.length} templates. Click to expand.`}
                />
              </summary>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rules</p>
                  <ul className="mt-2 space-y-2">
                    {business.rules.length === 0 ? (
                      <li className="text-sm text-gray-500">No rules.</li>
                    ) : (
                      business.rules.map((rule) => (
                        <li key={rule.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                          <p className="font-medium text-gray-900">
                            {rule.minStars ?? 1}–{rule.maxStars ?? 5}★ · {rule.responseType} · {rule.mode}
                          </p>
                          <p className="text-xs text-gray-500">
                            Priority {rule.priority}
                            {rule.template ? ` · ${rule.template.name}` : ""}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Templates</p>
                  <ul className="mt-2 space-y-2">
                    {business.templates.length === 0 ? (
                      <li className="text-sm text-gray-500">No templates.</li>
                    ) : (
                      business.templates.map((template) => (
                        <li key={template.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="mt-1 line-clamp-3 text-gray-600">{template.body}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </details>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Owner" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-right text-gray-900">{business.user.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Email</dt>
                <dd className="break-all text-right text-gray-900">{business.user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Business phone</dt>
                <dd className="text-right text-gray-900">{business.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Timezone</dt>
                <dd className="text-right text-gray-900">{business.timezone}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500">Role</dt>
                <dd>
                  <AdminOwnerRole
                    userId={business.user.id}
                    role={business.user.role}
                    canEdit={adminContext.accessLevel === "admin"}
                  />
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Billing" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Plan</dt>
                <dd><Badge tone={plan.tone}>{plan.label}</Badge></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{sub?.status === "trialing" ? "Trial ends" : "Period ends"}</dt>
                <dd className="text-gray-900">{formatAdminDate(sub?.status === "trialing" ? sub?.trialEndsAt : sub?.currentPeriodEnd)}</dd>
              </div>
              {sub?.cancelAtPeriodEnd ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Cancels</dt>
                  <dd className="text-red-700">{formatAdminDate(sub.cancelAt ?? sub.currentPeriodEnd)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Stripe</dt>
                <dd className="truncate font-mono text-xs text-gray-500" title={sub?.stripeSubscriptionId ?? undefined}>
                  {sub?.stripeCustomerId ?? "—"}
                </dd>
              </div>
            </dl>
            <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
              {business.paymentHistory.length === 0 ? (
                <li className="py-4 text-sm text-gray-500">No billing events.</li>
              ) : (
                business.paymentHistory.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900">
                        {formatMoney(event.amount, event.currency)}{" "}
                        <span className={event.status === "paid" ? "text-emerald-700" : "text-red-700"}>{event.status}</span>
                      </p>
                      <p className="truncate text-xs text-gray-400">{event.stripeEventType}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-gray-500">
                      {formatAdminDate(event.createdAt)}
                      {event.hostedInvoiceUrl ? (
                        <a
                          href={event.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 font-semibold text-blue-600 hover:text-blue-500"
                        >
                          Invoice
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Activity" subtitle="Admin actions, emails and auto-reply switches." />
            <ul className="mt-3 divide-y divide-gray-100">
              {business.adminAuditLogs.length === 0 ? (
                <li className="py-4 text-sm text-gray-500">No activity yet.</li>
              ) : (
                business.adminAuditLogs.map((log) => {
                  const meta = (log.metadata ?? {}) as Record<string, unknown>;
                  return (
                    <li key={log.id} className="py-2.5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-900">{formatAuditAction(log.action)}</p>
                        <span className="shrink-0 text-xs text-gray-400" title={formatAdminDateTime(log.createdAt)}>
                          {formatRelative(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        by {log.actorUser.name || log.actorUser.email}
                        {typeof meta.subject === "string" ? ` · “${meta.subject}”` : ""}
                      </p>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
