import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Customer actions shown in Admin → Audit log next to admin actions. They share
 * the AdminAuditLog table: the actor is whoever is signed in (an admin when
 * they act while viewing as the customer), the target is the business owner.
 *
 * Kept free of next-auth imports so lib/auth.ts can use it for sign-ins.
 */
export const CUSTOMER_ACTIONS = [
  "user_signed_in",
  "user_registered",
  "password_reset",
  "business_created",
  "auto_responder_enabled",
  "auto_responder_disabled",
  "ai_settings_updated",
  "google_connected",
  "google_disconnected",
  "google_location_selected",
  "reviews_sync_requested",
  "review_reply_published",
  "rule_created",
  "rule_updated",
  "rule_deleted",
  "template_created",
  "template_updated",
  "template_deleted",
  "checkout_started",
  "subscription_cancel_requested",
  "shop_order_started",
  "shop_order_canceled",
] as const;

export type CustomerAction = (typeof CUSTOMER_ACTIONS)[number];

type ActivityContext = {
  user: { id: string } | null;
  business?: { id: string; userId: string } | null;
  isImpersonating?: boolean;
};

export async function recordCustomerActivity(
  ctx: ActivityContext,
  action: CustomerAction,
  details: Record<string, Prisma.InputJsonValue> = {},
) {
  if (!ctx.user) return;
  // Never let logging break the customer's request.
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: ctx.user.id,
        action,
        targetUserId: ctx.business?.userId ?? ctx.user.id,
        targetBusinessId: ctx.business?.id ?? null,
        metadata: { ...details, ...(ctx.isImpersonating ? { viaImpersonation: true } : {}) },
      },
    });
  } catch (error) {
    console.error("[activity] failed to record", {
      actorUserId: ctx.user.id,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
