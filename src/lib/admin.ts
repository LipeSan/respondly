import { cookies } from "next/headers";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const ADMIN_IMPERSONATION_COOKIE = "respondly_admin_business_id";
export type AdminAccessLevel = "support" | "admin";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getConfiguredAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getConfiguredAdminEmails().includes(normalizeEmail(email));
}

export function getAdminAccessLevelForUser(user?: Pick<User, "email" | "role"> | null): AdminAccessLevel | null {
  if (!user) return null;
  if (user.role === "admin") return "admin";
  if (user.role === "support") return "support";
  if (isAdminEmail(user.email)) return "admin";
  return null;
}

export async function getCurrentAdminUser() {
  const session = await getSession();
  const email = session?.user?.email ? normalizeEmail(session.user.email) : "";
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  const accessLevel = getAdminAccessLevelForUser(user);
  if (!user || !accessLevel) return null;
  return { user, accessLevel };
}

export async function getAdminImpersonatedBusinessId() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_IMPERSONATION_COOKIE)?.value?.trim() || null;
}

export async function recordAdminAudit(args: {
  actorUserId: string;
  action: string;
  targetUserId?: string | null;
  targetBusinessId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: args.actorUserId,
        action: args.action,
        targetUserId: args.targetUserId ?? null,
        targetBusinessId: args.targetBusinessId ?? null,
        metadata: args.metadata,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin:audit] failed to record log", {
      actorUserId: args.actorUserId,
      action: args.action,
      error: message,
    });
  }
}
