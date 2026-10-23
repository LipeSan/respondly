import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness, isReadOnlySupportImpersonation } from "@/lib/currentBusiness";
import { COLOR_LABELS, getProduct, isProductColor, shippingFor, toCents } from "@/lib/shop";
import type { ShopOrderItem } from "@/lib/shopOrders";

const MAX_QUANTITY = 50;

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUserAndBusiness();
    const { business, user } = ctx;
    if (!business || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (isReadOnlySupportImpersonation(ctx)) {
      return NextResponse.json(
        { error: "Support accounts cannot place orders while impersonating." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : [];

    // Rebuild every line from the catalogue: only product ids, colours and
    // quantities come from the browser.
    const items: (ShopOrderItem & { color: NonNullable<ShopOrderItem["color"]> })[] = [];
    for (const raw of rawItems) {
      const r = raw as { id?: unknown; color?: unknown; quantity?: unknown };
      const product = typeof r.id === "string" ? getProduct(r.id) : null;
      const color = isProductColor(r.color) ? r.color : null;
      const quantity = Number(r.quantity);
      if (
        !product ||
        !color ||
        !product.colors.includes(color) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_QUANTITY
      ) {
        return NextResponse.json({ error: "Your order has an invalid item. Refresh the page and try again." }, { status: 400 });
      }
      if (items.some((i) => i.productId === product.id && i.color === color)) continue;
      items.push({ productId: product.id, name: product.name, color, quantity, unitAmount: toCents(product.price) });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Your order is empty." }, { status: 400 });
    }

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitAmount, 0);
    const shipping = toCents(shippingFor(subtotal / 100));

    const order = await prisma.shopOrder.create({
      data: {
        businessId: business.id,
        items,
        subtotal,
        shipping,
        total: subtotal + shipping,
        email: user.email,
      },
      select: { id: true },
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const metadata = { kind: "shop", orderId: order.id, businessId: business.id };

    // No `customer` on purpose: attaching the subscription's Stripe customer
    // would let refunds/disputes on this order be recorded in PaymentHistory,
    // which blocks the auto-responder (see src/lib/plan.ts).
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: "aud",
          unit_amount: i.unitAmount,
          product_data: { name: `${i.name} (${COLOR_LABELS[i.color]})` },
        },
      })),
      shipping_address_collection: { allowed_countries: ["AU"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shipping === 0 ? "Free shipping" : "Standard shipping",
            fixed_amount: { amount: shipping, currency: "aud" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 10 },
              maximum: { unit: "business_day", value: 20 },
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${appUrl}/shop/orders?checkout=success`,
      cancel_url: `${appUrl}/shop?checkout=cancel`,
    });

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    console.log("[shop:checkout] Created checkout session", {
      businessId: business.id,
      orderId: order.id,
      sessionId: session.id,
      total: subtotal + shipping,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shop:checkout] Failed to create checkout session", { error: msg });
    return NextResponse.json({ error: "Couldn't start the checkout. Please try again." }, { status: 500 });
  }
}
