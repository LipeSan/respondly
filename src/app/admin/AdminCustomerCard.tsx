"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";

export type AdminCustomerRole = "user" | "support" | "admin";

export type AdminCustomerBusinessRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: AdminCustomerRole;
    createdAt: string;
  };
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  google: {
    id: string;
    createdAt: string;
  } | null;
  paymentHistory: Array<{
    status: string;
    stripeEventType: string;
    createdAt: string;
  }>;
  _count: {
    templates: number;
    rules: number;
    reviews: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatRelativeDays(value?: string | null) {
  if (!value) return "—";
  const target = new Date(value);
  const today = new Date();
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `${diffDays}d left`;
  return `${Math.abs(diffDays)}d ago`;
}

function getSubscriptionBadge(subscription: AdminCustomerBusinessRow["subscription"]) {
  if (!subscription) {
    return {
      label: "No plan",
      classes: "border-gray-200 bg-gray-100 text-gray-700",
      emphasis: "Needs setup",
    };
  }

  if (subscription.cancelAtPeriodEnd) {
    return {
      label: "Cancel scheduled",
      classes: "border-amber-200 bg-amber-100 text-amber-800",
      emphasis: "Attention",
    };
  }

  switch (subscription.status) {
    case "active":
      return {
        label: "Active",
        classes: "border-emerald-200 bg-emerald-100 text-emerald-800",
        emphasis: "Healthy",
      };
    case "trialing":
      return {
        label: "Trialing",
        classes: "border-blue-200 bg-blue-100 text-blue-800",
        emphasis: "Trial",
      };
    case "past_due":
      return {
        label: "Past due",
        classes: "border-red-200 bg-red-100 text-red-800",
        emphasis: "Billing issue",
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        label: "Incomplete",
        classes: "border-amber-200 bg-amber-100 text-amber-800",
        emphasis: "Checkout pending",
      };
    case "canceled":
      return {
        label: "Canceled",
        classes: "border-red-200 bg-red-100 text-red-800",
        emphasis: "Inactive",
      };
    default:
      return {
        label: subscription.status,
        classes: "border-gray-200 bg-gray-100 text-gray-700",
        emphasis: "Unknown",
      };
  }
}

function getPlanBadge(plan?: string | null) {
  if (plan === "pro") {
    return { label: "Pro", classes: "border-violet-200 bg-violet-100 text-violet-800" };
  }
  if (plan === "starter") {
    return { label: "Starter", classes: "border-sky-200 bg-sky-100 text-sky-800" };
  }
  return { label: "Free", classes: "border-gray-200 bg-gray-100 text-gray-700" };
}

function getRoleBadge(role: AdminCustomerRole) {
  if (role === "admin") return "border-rose-200 bg-rose-100 text-rose-800";
  if (role === "support") return "border-amber-200 bg-amber-100 text-amber-800";
  return "border-gray-200 bg-gray-100 text-gray-700";
}

function getBillingHealthState(subscription: AdminCustomerBusinessRow["subscription"]) {
  if (!subscription) {
    return {
      label: "Needs setup",
      classes: "text-amber-700",
    };
  }

  if (subscription.cancelAtPeriodEnd) {
    return {
      label: "Attention",
      classes: "text-amber-700",
    };
  }

  switch (subscription.status) {
    case "active":
      return {
        label: "Healthy",
        classes: "text-emerald-700",
      };
    case "trialing":
      return {
        label: "Trial",
        classes: "text-amber-700",
      };
    case "past_due":
      return {
        label: "Billing issue",
        classes: "text-red-700",
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        label: "Checkout pending",
        classes: "text-amber-700",
      };
    case "canceled":
      return {
        label: "Inactive",
        classes: "text-red-700",
      };
    default:
      return {
        label: "Unknown",
        classes: "text-gray-900",
      };
  }
}

export function AdminCustomerCard({
  business,
  isCurrent,
  accessLevel,
  roleDraft,
  actionLoading,
  isActionsOpen,
  onRoleChange,
  onSaveRole,
  onToggleActions,
  onCloseActions,
  onOpenBusiness,
}: {
  business: AdminCustomerBusinessRow;
  isCurrent: boolean;
  accessLevel: "support" | "admin";
  roleDraft: AdminCustomerRole;
  actionLoading: string | null;
  isActionsOpen: boolean;
  onRoleChange: (role: AdminCustomerRole) => void;
  onSaveRole: () => void;
  onToggleActions: () => void;
  onCloseActions: () => void;
  onOpenBusiness: (destination: string) => void;
}) {
  const latestBilling = business.paymentHistory[0] ?? null;
  const subscriptionBadge = getSubscriptionBadge(business.subscription);
  const planBadge = getPlanBadge(business.subscription?.plan);
  const hasBillingIssue =
    business.subscription?.status === "past_due" ||
    business.subscription?.status === "canceled" ||
    business.subscription?.status === "incomplete" ||
    business.subscription?.status === "incomplete_expired";
  const needsAttention =
    hasBillingIssue ||
    !business.google ||
    !business.subscription ||
    Boolean(business.subscription?.cancelAtPeriodEnd);
  const nextLifecycleDate = business.subscription?.cancelAtPeriodEnd
    ? business.subscription?.trialEndsAt ?? business.subscription?.currentPeriodEnd
    : business.subscription?.currentPeriodEnd ?? business.subscription?.trialEndsAt;
  const billingHealth = getBillingHealthState(business.subscription);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="h2" className="text-xl">
                {business.name}
              </Text>
              {isCurrent ? (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  Active access
                </span>
              ) : null}
              {needsAttention ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Needs attention
                </span>
              ) : null}
            </div>
            <Text variant="body" className="mt-1 text-sm text-gray-600">
              Owner: {business.user.name || "Unnamed user"} ({business.user.email})
            </Text>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${subscriptionBadge.classes}`}>
              {subscriptionBadge.label}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planBadge.classes}`}>
              {planBadge.label}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                business.google
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                  : "border-red-200 bg-red-100 text-red-800"
              }`}
            >
              {business.google ? "Google connected" : "Google missing"}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadge(business.user.role)}`}>
              {business.user.role}
            </span>
            <Link
              href={`/admin/businesses/${business.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              onClick={onCloseActions}
            >
              View details
            </Link>
            <div className="relative" data-customer-actions-menu>
              <Button
                type="button"
                variant="outline"
                className="!w-auto px-3 py-2"
                aria-haspopup="menu"
                aria-expanded={isActionsOpen}
                onClick={onToggleActions}
              >
                <span className="sr-only">Open customer actions</span>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10 3a1.75 1.75 0 110 3.5A1.75 1.75 0 0110 3zm0 5.25a1.75 1.75 0 110 3.5 1.75 1.75 0 010-3.5zm0 5.25a1.75 1.75 0 110 3.5 1.75 1.75 0 010-3.5z" />
                </svg>
              </Button>
              {isActionsOpen ? (
                <div
                  className="absolute right-0 top-full z-20 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                  role="menu"
                >
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => onOpenBusiness("/dashboard")}
                  >
                    {actionLoading === `${business.id}:/dashboard` ? "Opening dashboard..." : "Open dashboard"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => onOpenBusiness("/configuration")}
                  >
                    {actionLoading === `${business.id}:/configuration` ? "Opening configuration..." : "Configuration"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => onOpenBusiness("/rules")}
                  >
                    {actionLoading === `${business.id}:/rules` ? "Opening rules..." : "Rules"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={() => onOpenBusiness("/templates")}
                  >
                    {actionLoading === `${business.id}:/templates` ? "Opening templates..." : "Templates"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex-1 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Text variant="body" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Billing health
              </Text>
              <p className={`mt-2 text-base font-semibold ${billingHealth.classes}`}>{billingHealth.label}</p>
              <Text variant="body" className="mt-1 text-xs text-gray-500">
                Status: {business.subscription?.status ?? "none"}
              </Text>
              <Text variant="body" className="mt-1 text-xs text-gray-500">
                {latestBilling ? `${latestBilling.status} via ${latestBilling.stripeEventType}` : "No billing events yet"}
              </Text>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Text variant="body" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Renewal / trial
              </Text>
              <Text variant="body" className="mt-2 text-base font-semibold text-gray-900">
                {formatRelativeDays(nextLifecycleDate)}
              </Text>
              <Text variant="body" className="mt-1 text-xs text-gray-500">
                {business.subscription?.cancelAtPeriodEnd ? "Access ends" : "Next lifecycle"}: {formatDate(nextLifecycleDate)}
              </Text>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Text variant="body" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Automation setup
              </Text>
              <Text variant="body" className="mt-2 text-base font-semibold text-gray-900">
                {business._count.rules} rules / {business._count.templates} templates
              </Text>
              <Text variant="body" className="mt-1 text-xs text-gray-500">
                {business._count.reviews} reviews in the workspace
              </Text>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Text variant="body" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Last billing update
              </Text>
              <Text variant="body" className="mt-2 text-base font-semibold text-gray-900">
                {formatDate(latestBilling?.createdAt)}
              </Text>
              <Text variant="body" className="mt-1 text-xs text-gray-500">
                {latestBilling ? latestBilling.stripeEventType : "No recent billing signal"}
              </Text>
            </div>
            </div>

            <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-3">
              <div><span className="font-semibold text-gray-900">Business email:</span> {business.email || "—"}</div>
              <div><span className="font-semibold text-gray-900">Phone:</span> {business.phone || "—"}</div>
              <div><span className="font-semibold text-gray-900">Created:</span> {formatDate(business.createdAt)}</div>
              <div><span className="font-semibold text-gray-900">Next billing:</span> {formatDate(business.subscription?.currentPeriodEnd)}</div>
              <div><span className="font-semibold text-gray-900">Trial ends:</span> {formatDate(business.subscription?.trialEndsAt)}</div>
              <div><span className="font-semibold text-gray-900">Google connected:</span> {business.google ? "Yes" : "No"}</div>
              <div><span className="font-semibold text-gray-900">Templates:</span> {business._count.templates}</div>
              <div><span className="font-semibold text-gray-900">Rules:</span> {business._count.rules}</div>
              <div><span className="font-semibold text-gray-900">Reviews:</span> {business._count.reviews}</div>
              <div>
                <span className="font-semibold text-gray-900">Billing:</span>{" "}
                {latestBilling ? `${latestBilling.status} (${latestBilling.stripeEventType})` : "No events"}
              </div>
              <div><span className="font-semibold text-gray-900">Owner role:</span> {business.user.role}</div>
              <div>
                <span className="font-semibold text-gray-900">Subscription:</span>{" "}
                {business.subscription ? `${business.subscription.plan} · ${business.subscription.status}` : "None"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <Text variant="body" className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Admin controls
            </Text>
            <div className="mt-3 space-y-3">
              <Select
                id={`ownerRole-${business.user.id}`}
                name={`ownerRole-${business.user.id}`}
                label="Owner role"
                value={roleDraft}
                onChange={(e) => onRoleChange(e.target.value as AdminCustomerRole)}
                disabled={accessLevel !== "admin"}
              >
                <option value="user">user</option>
                <option value="support">support</option>
                <option value="admin">admin</option>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="!w-auto"
                disabled={accessLevel !== "admin" || roleDraft === business.user.role}
                isLoading={actionLoading === `role:${business.user.id}`}
                onClick={onSaveRole}
              >
                Save role
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
