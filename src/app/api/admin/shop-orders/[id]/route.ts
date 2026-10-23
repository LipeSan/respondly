import { NextResponse } from "next/server";
import { getCurrentAdminUser, recordAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Moves a paid order to shipped with its tracking number, or back to paid
 * (clearing the tracking number) to undo a mistake.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (adminContext.accessLevel !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const status = body.status === "shipped" || body.status === "paid" ? body.status : null;
  if (!status) {
    return NextResponse.json({ error: "status must be shipped or paid" }, { status: 400 });
  }

  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  if (status === "shipped" && (!trackingNumber || trackingNumber.length > 100)) {
    return NextResponse.json({ error: "Enter the tracking number." }, { status: 400 });
  }

  const from = status === "shipped" ? "paid" : "shipped";
  const updated = await prisma.shopOrder.updateMany({
    where: { id, status: from },
    data:
      status === "shipped"
        ? { status, trackingNumber, shippedAt: new Date() }
        : { status, trackingNumber: null, shippedAt: null },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: `Only ${from} orders can be marked ${status}.` }, { status: 409 });
  }

  const order = await prisma.shopOrder.findUnique({ where: { id }, select: { businessId: true } });
  await recordAdminAudit({
    actorUserId: adminContext.user.id,
    action: status === "shipped" ? "shop_order_shipped" : "shop_order_unshipped",
    targetBusinessId: order?.businessId ?? null,
    metadata: status === "shipped" ? { orderId: id, trackingNumber } : { orderId: id },
  });

  return NextResponse.json({ ok: true });
}
