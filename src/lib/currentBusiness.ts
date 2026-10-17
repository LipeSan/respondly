import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAdminAccessLevelForUser,
  getAdminImpersonatedBusinessId,
  type AdminAccessLevel,
} from "@/lib/admin";

export async function getCurrentUserAndBusiness() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  const empty = {
    user: null,
    business: null,
    isAdmin: false,
    isImpersonating: false,
    accessLevel: null as AdminAccessLevel | null,
  };
  if (!email) return empty;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return empty;

  const accessLevel = getAdminAccessLevelForUser(user);
  const isAdmin = Boolean(accessLevel);

  if (isAdmin) {
    const impersonatedBusinessId = await getAdminImpersonatedBusinessId();
    if (impersonatedBusinessId) {
      const impersonatedBusiness = await prisma.business.findUnique({
        where: { id: impersonatedBusinessId },
      });
      if (impersonatedBusiness) {
        return {
          user,
          business: impersonatedBusiness,
          isAdmin,
          isImpersonating: true,
          accessLevel,
        };
      }
    }
  }

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return { user, business, isAdmin, isImpersonating: false, accessLevel };
}

/**
 * True when the current request is a "support" admin acting on a business
 * via impersonation. Used to block destructive/billing actions — support
 * can view and help configure a customer's account, but cannot cancel
 * subscriptions, create charges, or disconnect integrations on their behalf.
 * Full admins are unrestricted.
 */
export function isReadOnlySupportImpersonation(ctx: {
  isImpersonating: boolean;
  accessLevel: AdminAccessLevel | null;
}) {
  return ctx.isImpersonating && ctx.accessLevel === "support";
}
