import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { formatDate } from "@/lib/date";
import { syncPendingShopOrders, shopItemKey, shopItemLabel, type ShopOrderItem } from "@/lib/shopOrders";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import { CancelOrderButton } from "./CancelOrderButton";
import { ClearCartOnSuccess } from "./ClearCartOnSuccess";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Awaiting payment", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid · preparing", className: "bg-emerald-100 text-emerald-800" },
  shipped: { label: "Shipped", className: "bg-blue-100 text-blue-800" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-700" },
};

type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

function formatAddress(address: unknown) {
  const a = (address ?? {}) as ShippingAddress;
  return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function oneDayAgo() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

function formatCents(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

export default async function ShopOrdersPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) redirect("/onboarding");

  const { checkout } = await searchParams;
  const justPaid = checkout === "success";

  // Abandoned checkouts stay "pending" until Stripe expires them; only show
  // them for a day so the list isn't full of carts that were never paid.
  const dayAgo = oneDayAgo();
  await syncPendingShopOrders(business.id, dayAgo);
  const orders = await prisma.shopOrder.findMany({
    where: {
      businessId: business.id,
      OR: [{ status: { in: ["paid", "shipped"] } }, { status: "pending", createdAt: { gte: dayAgo } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="pb-12">
      {justPaid ? <ClearCartOnSuccess /> : null}
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Text variant="h1">Your orders</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              NFC products you bought from the Shop.
            </p>
          </div>
          <Link href="/shop" className="shrink-0">
            <Button variant="outline" className="!w-auto px-4 py-2">
              Back to shop
            </Button>
          </Link>
        </div>

        {justPaid ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Thanks for your order! We&apos;ve received your payment and will ship it within 10–20 business days.
            {orders[0]?.status === "pending" ? " It can take a few seconds to show as paid here." : ""}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <p className="text-sm font-medium text-gray-700">No orders yet</p>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              Cards and stands you order from the Shop will show up here.
            </p>
            <Link href="/shop" className="mt-5">
              <Button className="!w-auto px-4 py-2">Browse the shop</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items as ShopOrderItem[];
              const status = STATUS[order.status] ?? STATUS.pending;
              return (
                <Card key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">Order from {formatDate(order.createdAt)}</p>
                      <p className="mt-0.5 font-mono text-xs text-gray-400">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </div>

                  {order.status === "shipped" && order.trackingNumber ? (
                    <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      Shipped{order.shippedAt ? ` on ${formatDate(order.shippedAt)}` : ""} · Tracking number{" "}
                      <span className="select-all font-mono font-semibold">{order.trackingNumber}</span>
                    </p>
                  ) : null}

                  <ul className="mt-4 space-y-2">
                    {items.map((item) => (
                      <li key={shopItemKey(item)} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-700">
                          <span className="tabular-nums text-gray-400">{item.quantity} ×</span> {shopItemLabel(item)}
                        </span>
                        <span className="tabular-nums text-gray-900">{formatCents(item.quantity * item.unitAmount)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-4 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ship to</p>
                      {order.shippingName ? (
                        <>
                          <p className="mt-1 font-medium text-gray-900">{order.shippingName}</p>
                          <p className="text-gray-500">{formatAddress(order.shippingAddress)}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-gray-500">Added when you pay on the Stripe page.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-gray-500">
                        Shipping {order.shipping === 0 ? "free" : formatCents(order.shipping)} ·{" "}
                        <span className="font-semibold text-gray-900">Total {formatCents(order.total)}</span>
                      </p>
                      {order.status === "pending" ? (
                        <CancelOrderButton orderId={order.id} orderNumber={order.id.slice(-8).toUpperCase()} />
                      ) : null}
                      {order.status === "pending" && order.stripeSessionId ? (
                        // Plain <a>: the route redirects off-site to Stripe.
                        <a href={`/api/shop/orders/${order.id}/pay`}>
                          <Button className="!w-auto px-4 py-2">Complete payment</Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
