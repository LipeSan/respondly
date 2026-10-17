import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness, isReadOnlySupportImpersonation } from "@/lib/currentBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getCurrentUserAndBusiness();
  const { business } = ctx;
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }
  if (isReadOnlySupportImpersonation(ctx)) {
    return NextResponse.json(
      { error: "Support accounts cannot disconnect Google while impersonating. Ask an admin." },
      { status: 403 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.googleConnection.deleteMany({ where: { businessId: business.id } }),
      prisma.business.update({
        where: { id: business.id },
        data: {
          googleAccountName: null,
          googleLocationId: null,
          googleLocationName: null,
          initialSyncCompleted: false,
          connectedAt: null,
          autoResponderEnabled: false,
        },
      }),
    ]);

    console.log("[google:disconnect] Disconnected Google for business", { businessId: business.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to disconnect Google";
    console.error("[google:disconnect] Failed", { businessId: business.id, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
