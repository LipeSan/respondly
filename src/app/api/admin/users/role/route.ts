import { NextResponse } from "next/server";
import { recordAdminAudit, getCurrentAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedRoles = new Set(["user", "support", "admin"]);

export async function PUT(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (adminContext.accessLevel !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim().toLowerCase() : "";

  if (!userId || !allowedRoles.has(role)) {
    return NextResponse.json({ error: "userId and valid role are required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: role as "user" | "support" | "admin" },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
    },
  });

  await recordAdminAudit({
    actorUserId: adminContext.user.id,
    action: "user_role_updated",
    targetUserId: updatedUser.id,
    metadata: {
      previousRole: targetUser.role,
      nextRole: updatedUser.role,
    },
  });

  return NextResponse.json({ user: updatedUser });
}
