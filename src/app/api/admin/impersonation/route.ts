import { NextResponse } from "next/server";
import {
  ADMIN_IMPERSONATION_COOKIE,
  getAdminImpersonatedBusinessId,
  getCurrentAdminUser,
  recordAdminAudit,
} from "@/lib/admin";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function applyCookie(response: NextResponse, value?: string) {
  response.cookies.set(ADMIN_IMPERSONATION_COOKIE, value ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value ? 60 * 60 * 8 : 0,
  });
}

export async function POST(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, business });
  applyCookie(response, business.id);
  await recordAdminAudit({
    actorUserId: adminContext.user.id,
    action: "impersonation_started",
    targetBusinessId: business.id,
    metadata: { accessLevel: adminContext.accessLevel },
  });
  return response;
}

export async function DELETE() {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = await getAdminImpersonatedBusinessId();

  const response = NextResponse.json({ ok: true });
  applyCookie(response);
  await recordAdminAudit({
    actorUserId: adminContext.user.id,
    action: "impersonation_stopped",
    targetBusinessId: businessId,
    metadata: { accessLevel: adminContext.accessLevel },
  });
  return response;
}
