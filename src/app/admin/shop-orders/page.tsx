import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/admin";
import { formatDateTime } from "@/lib/date";
import { shopItemKey, shopItemLabel, type ShopOrderItem } from "@/lib/shopOrders";
import { Badge, Card, PageHeader, formatRelative, type BadgeTone } from "../ui";
import { AdminShopOrderAction } from "./AdminShopOrderAction";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const statusFilters = ["to_ship", "shipped", "pending", "canceled", "all"] as const;
type StatusFilter = (typeof statusFilters)[number];

const filterLabels: Record<StatusFilter, string> = {
  to_ship: "To ship",
  shipped: "Shipped",
  pending: "Awaiting payment",
  canceled: "Canceled",
  all: "All orders",
};

const statusBadges: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "awaiting payment", tone: "amber" },
  paid: { label: "to ship", tone: "blue" },
  shipped: { label: "shipped", tone: "green" },
  canceled: { label: "canceled", tone: "gray" },
};

const filterWhere: Record<StatusFilter, Prisma.ShopOrderWhereInput> = {
  to_ship: { status: "paid" },
  shipped: { status: "shipped" },
  pending: { status: "pending" },
  canceled: { status: "canceled" },
  all: {},
};

type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : allowed[0];
}

function formatCents(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

function addressLines(address: unknown) {
  const a = (address ?? {}) as ShippingAddress;
  return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean) as string[];
}

function buildHref(params: { status: StatusFilter; business?: string; before?: string }) {
  const search = new URLSearchParams();
  if (params.status !== "to_ship") search.set("status", params.status);
  if (params.business) search.set("business", params.business);
  if (params.before) search.set("before", params.before);
  const query = search.toString();
  return query ? `/admin/shop-orders?${query}` : "/admin/shop-orders";
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: "blue" }) {
  const valueClass = tone === "blue" && value !== 0 ? "text-blue-600" : "text-gray-900";
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
    </Card>
  );
}

export default async function AdminShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; business?: string; before?: string }>;
}) {
  const params = await searchParams;
  const status = pick(params.status, statusFilters);
  const businessId = params.business || undefined;
  const before = params.before && !Number.isNaN(Date.parse(params.before)) ? new Date(params.before) : undefined;

  const where: Prisma.ShopOrderWhereInput = {
    ...filterWhere[status],
    ...(businessId ? { businessId } : {}),
    ...(before ? { createdAt: { lt: before } } : {}),
  };

  const [adminContext, orders, toShip, shipped, revenue, filteredBusiness] = await Promise.all([
    getCurrentAdminUser(),
    prisma.shopOrder.findMany({
      where,
      // Oldest first for the shipping queue, newest first everywhere else.
      orderBy: { createdAt: status === "to_ship" ? "asc" : "desc" },
      take: PAGE_SIZE + 1,
      include: { business: { select: { id: true, name: true } } },
    }),
    prisma.shopOrder.count({ where: { status: "paid" } }),
    prisma.shopOrder.count({ where: { status: "shipped" } }),
    prisma.shopOrder.aggregate({ where: { status: { in: ["paid", "shipped"] } }, _sum: { total: true } }),
    businessId ? prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }) : null,
  ]);
  const canEdit = adminContext?.accessLevel === "admin";

  // The shipping queue is short and oldest-first, so it isn't paginated.
  const paginate = status !== "to_ship";
  const hasMore = paginate && orders.length > PAGE_SIZE;
  const page = orders.slice(0, PAGE_SIZE);
  const nextBefore = hasMore ? page[page.length - 1].createdAt.toISOString() : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Shop orders" subtitle="NFC products bought from the Shop. Ship paid orders, then mark them shipped." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <SummaryCard label="To ship" value={toShip} tone="blue" />
        <SummaryCard label="Shipped" value={shipped} />
        <SummaryCard label="Revenue (paid orders)" value={formatCents(revenue._sum.total ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <FilterChip key={s} href={buildHref({ status: s, business: businessId })} active={status === s}>
            {filterLabels[s]}
          </FilterChip>
        ))}
      </div>

      {businessId ? (
        <p className="text-sm text-gray-600">
          Showing orders for <span className="font-semibold text-gray-900">{filteredBusiness?.name ?? "unknown business"}</span>.{" "}
          <Link href={buildHref({ status })} className="font-semibold text-blue-600 hover:text-blue-500">
            Show all businesses
          </Link>
        </p>
      ) : null}

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">Ordered</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Items</th>
                <th scope="col" className="px-4 py-3">Ship to</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {page.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    {status === "to_ship" ? "Nothing to ship right now." : "No orders match these filters."}
                  </td>
                </tr>
              ) : (
                page.map((order) => {
                  const items = order.items as ShopOrderItem[];
                  const badge = statusBadges[order.status] ?? statusBadges.pending;
                  const lines = addressLines(order.shippingAddress);
                  return (
                    <tr key={order.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="text-gray-900">{formatDateTime(order.paidAt ?? order.createdAt)}</span>
                        <p className="text-xs text-gray-400">{formatRelative(order.paidAt ?? order.createdAt)}</p>
                        <p className="mt-1 font-mono text-xs text-gray-400">#{order.id.slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/businesses/${order.business.id}`} className="font-medium text-gray-900 hover:underline">
                          {order.business.name}
                        </Link>
                        {order.email ? <p className="text-xs text-gray-500">{order.email}</p> : null}
                        {!businessId ? (
                          <Link
                            href={buildHref({ status, business: order.business.id })}
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                          >
                            Only this customer
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-0.5 text-gray-700">
                          {items.map((item) => (
                            <li key={shopItemKey(item)}>
                              <span className="tabular-nums text-gray-400">{item.quantity} ×</span> {shopItemLabel(item)}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.shippingName ? (
                          <>
                            <p className="font-medium text-gray-900">{order.shippingName}</p>
                            {lines.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="font-semibold tabular-nums text-gray-900">{formatCents(order.total)}</span>
                        <p className="text-xs text-gray-400">
                          {order.shipping === 0 ? "free shipping" : `incl. ${formatCents(order.shipping)} shipping`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {order.trackingNumber ? (
                          <p className="mt-1 font-mono text-xs text-gray-600" title="Tracking number">
                            {order.trackingNumber}
                          </p>
                        ) : null}
                        {order.shippedAt ? (
                          <p className="text-xs text-gray-400">{formatDateTime(order.shippedAt)}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {canEdit && (order.status === "paid" || order.status === "shipped") ? (
                            <AdminShopOrderAction
                              orderId={order.id}
                              orderNumber={order.id.slice(-8).toUpperCase()}
                              status={order.status}
                            />
                          ) : null}
                          {order.shippingName ? (
                            <Link
                              href={`/admin/shop-orders/${order.id}/label`}
                              target="_blank"
                              className="whitespace-nowrap text-sm font-semibold text-blue-600 hover:text-blue-500"
                            >
                              Print label
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {nextBefore || before ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm">
            {before ? (
              <Link href={buildHref({ status, business: businessId })} className="font-semibold text-blue-600 hover:text-blue-500">
                ← Newest
              </Link>
            ) : (
              <span />
            )}
            {nextBefore ? (
              <Link
                href={buildHref({ status, business: businessId, before: nextBefore })}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Older →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
