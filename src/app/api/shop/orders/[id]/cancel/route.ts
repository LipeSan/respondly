import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness, isReadOnlySupportImpersonation } from "@/lib/currentBusiness";
import { handleShopCheckoutEvent } from "@/lib/shopOrders";

/**
 * Cancels a pending order by expiring its Stripe session, so the old payment
 * page can't be paid afterwards. If the session was already paid, the order
 * is marked paid instead.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ordersUrl = new URL("/shop/orders", req.url);

  const ctx = await getCurrentUserAndBusiness();
  if (!ctx.business) return NextResponse.redirect(new URL("/login", req.url), 303);
  if (isReadOnlySupportImpersonation(ctx)) return NextResponse.redirect(ordersUrl, 303);

  const order = await prisma.shopOrder.findFirst({
    where: { id, businessId: ctx.business.id, status: "pending" },
    select: { id: true, stripeSessionId: true },
  });
  if (!order) return NextResponse.redirect(ordersUrl, 303);

  if (!order.stripeSessionId) {
    await prisma.shopOrder.updateMany({ where: { id: order.id, status: "pending" }, data: { status: "canceled" } });
    return NextResponse.redirect(ordersUrl, 303);
  }

  try {
    let session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.status === "open") {
      session = await stripe.checkout.sessions.expire(session.id);
    }
    if (session.status === "complete") {
      await handleShopCheckoutEvent("checkout.session.completed", session);
    } else if (session.status === "expired") {
      await handleShopCheckoutEvent("checkout.session.expired", session);
    }
  } catch (e) {
    // Leave the order pending: if the session couldn't be expired it may still be paid.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shop:cancel] Failed to cancel order", { orderId: order.id, error: msg });
  }
  return NextResponse.redirect(ordersUrl, 303);
}
