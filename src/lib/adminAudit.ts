import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CUSTOMER_ACTIONS } from "@/lib/activity";

export const AUDIT_PAGE_SIZE = 100;

export const AUDIT_FILTERS = ["all", "customers", "admin"] as const;
export type AuditFilter = (typeof AUDIT_FILTERS)[number];

export function parseAuditFilter(value: string | null | undefined): AuditFilter {
  return AUDIT_FILTERS.includes(value as AuditFilter) ? (value as AuditFilter) : "all";
}

const customerActions = [...CUSTOMER_ACTIONS] as string[];

export type AuditRow = {
  id: string;
  action: string;
  createdAt: string;
  metadata: Prisma.JsonValue;
  actor: { name: string | null; email: string; role: string };
  targetUserEmail: string | null;
  targetBusiness: { id: string; name: string } | null;
};

export type AuditPage = { rows: AuditRow[]; nextCursor: string | null };

/** Newest first, AUDIT_PAGE_SIZE at a time; pass the previous page's nextCursor to continue. */
export async function loadAuditPage(args: {
  filter: AuditFilter;
  businessId?: string | null;
  cursor?: string | null;
}): Promise<AuditPage> {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(args.filter === "customers" ? { action: { in: customerActions } } : {}),
    ...(args.filter === "admin" ? { action: { notIn: customerActions } } : {}),
    ...(args.businessId ? { targetBusinessId: args.businessId } : {}),
  };

  const logs = await prisma.adminAuditLog.findMany({
    where,
    // id breaks ties between events logged in the same millisecond, so pages never overlap.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_PAGE_SIZE + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
      actorUser: { select: { name: true, email: true, role: true } },
      targetUser: { select: { email: true } },
      targetBusiness: { select: { id: true, name: true } },
    },
  });

  const hasMore = logs.length > AUDIT_PAGE_SIZE;
  const page = hasMore ? logs.slice(0, AUDIT_PAGE_SIZE) : logs;

  return {
    rows: page.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      metadata: log.metadata,
      actor: log.actorUser,
      targetUserEmail: log.targetUser?.email ?? null,
      targetBusiness: log.targetBusiness,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
