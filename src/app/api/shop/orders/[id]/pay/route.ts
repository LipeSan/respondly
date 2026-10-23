import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { handleShopCheckoutEvent } from "@/lib/shopOrders";

/**
 * Sends the user back to the Stripe page of a pending order. If the session
 * is no longer open (paid or expired), applies that result and returns to the
 * orders list instead.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ordersUrl = new URL("/shop/orders", req.url);

  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.redirect(new URL("/login", req.url));

  const order = await prisma.shopOrder.findFirst({
    where: { id, businessId: business.id },
    select: { id: true, status: true, stripeSessionId: true },
  });
  if (!order || order.status !== "pending" || !order.stripeSessionId) {
    return NextResponse.redirect(ordersUrl);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.status === "open" && session.url) {
      return NextResponse.redirect(session.url, 303);
    }
    if (session.status === "complete") {
      await handleShopCheckoutEvent("checkout.session.completed", session);
    } else if (session.status === "expired") {
      await handleShopCheckoutEvent("checkout.session.expired", session);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shop:pay] Failed to resume checkout", { orderId: order.id, error: msg });
  }
  return NextResponse.redirect(ordersUrl, 303);
}
