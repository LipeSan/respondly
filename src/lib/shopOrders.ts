import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getConfiguredAdminEmails } from "@/lib/admin";
import { sendEmail } from "@/lib/email/sendEmail";
import { COLOR_LABELS, isProductColor, type ProductColor } from "@/lib/shop";

// `color` is missing on orders placed before colours were added.
export type ShopOrderItem = { productId: string; name: string; color?: ProductColor; quantity: number; unitAmount: number };

/** "Table stand · Black", or just the name for orders without a colour. */
export function shopItemLabel(item: ShopOrderItem) {
  return item.color && isProductColor(item.color) ? `${item.name} · ${COLOR_LABELS[item.color]}` : item.name;
}

export function shopItemKey(item: ShopOrderItem) {
  return `${item.productId}:${item.color ?? ""}`;
}

export function isShopCheckoutSession(session: Stripe.Checkout.Session) {
  return session.metadata?.kind === "shop";
}

function formatCents(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function notifyAdmins(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { business: { select: { name: true } } },
  });
  const admins = getConfiguredAdminEmails();
  if (!order || admins.length === 0) return;

  const items = order.items as ShopOrderItem[];
  const address = (order.shippingAddress ?? {}) as Partial<Stripe.Address>;
  const addressLines = [
    order.shippingName,
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean) as string[];

  const itemLines = items.map((i) => `${i.quantity} × ${shopItemLabel(i)} — ${formatCents(i.quantity * i.unitAmount)}`);
  const text = [
    `New Shop order from ${order.business.name}`,
    "",
    ...itemLines,
    `Shipping: ${formatCents(order.shipping)}`,
    `Total: ${formatCents(order.total)}`,
    "",
    "Ship to:",
    ...addressLines,
    "",
    `Customer email: ${order.email ?? "—"}`,
    `Order ID: ${order.id}`,
  ].join("\n");

  const html = `
    <p><strong>New Shop order from ${escapeHtml(order.business.name)}</strong></p>
    <ul>${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
    <p>Shipping: ${formatCents(order.shipping)}<br/><strong>Total: ${formatCents(order.total)}</strong></p>
    <p><strong>Ship to:</strong><br/>${addressLines.map(escapeHtml).join("<br/>")}</p>
    <p>Customer email: ${escapeHtml(order.email ?? "—")}<br/>Order ID: ${order.id}</p>
  `;

  for (const to of admins) {
    try {
      await sendEmail({ to, subject: `New Shop order — ${order.business.name} (${formatCents(order.total)})`, html, text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[shop:webhook] Failed to email admin about order", { orderId, error: msg });
    }
  }
}

/**
 * Asks Stripe about this business's recent pending orders and applies the
 * result, so an order shows as paid even if the webhook is late or missing
 * (e.g. locally without `stripe listen`). Safe to repeat: it goes through the
 * same idempotent handler as the webhook.
 */
export async function syncPendingShopOrders(businessId: string, since: Date) {
  const pending = await prisma.shopOrder.findMany({
    where: { businessId, status: "pending", stripeSessionId: { not: null }, createdAt: { gte: since } },
    select: { id: true, stripeSessionId: true },
    take: 10,
  });

  for (const order of pending) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId!);
      if (!isShopCheckoutSession(session) || session.metadata?.orderId !== order.id) continue;
      if (session.status === "complete") {
        await handleShopCheckoutEvent("checkout.session.completed", session);
      } else if (session.status === "expired") {
        await handleShopCheckoutEvent("checkout.session.expired", session);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[shop:sync] Failed to sync order with Stripe", { orderId: order.id, error: msg });
    }
  }
}

/**
 * Handles Stripe checkout events for Shop orders. Called by the Stripe webhook
 * before the subscription handlers, so these sessions never touch
 * Subscription or PaymentHistory.
 */
export async function handleShopCheckoutEvent(type: Stripe.Event.Type, session: Stripe.Checkout.Session) {
  const orderId = String(session.metadata?.orderId ?? "");
  if (!orderId) return;

  const paid =
    type === "checkout.session.async_payment_succeeded" ||
    (type === "checkout.session.completed" && session.payment_status === "paid");

  if (paid) {
    const shipping = session.collected_information?.shipping_details ?? null;
    // Only the first delivery of the event moves the order out of pending,
    // so Stripe retries don't send the admin email twice.
    const updated = await prisma.shopOrder.updateMany({
      where: { id: orderId, status: "pending" },
      data: {
        status: "paid",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        email: session.customer_details?.email ?? undefined,
        shippingName: shipping?.name ?? null,
        shippingAddress: shipping?.address ? (shipping.address as unknown as object) : undefined,
      },
    });
    console.log("[shop:webhook] Order paid", { orderId, sessionId: session.id, updated: updated.count });
    if (updated.count === 1) await notifyAdmins(orderId);
    return;
  }

  if (type === "checkout.session.async_payment_failed" || type === "checkout.session.expired") {
    await prisma.shopOrder.updateMany({
      where: { id: orderId, status: "pending" },
      data: { status: "canceled" },
    });
    console.log("[shop:webhook] Order canceled", { orderId, type });
  }
}
