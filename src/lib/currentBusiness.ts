import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminAccessLevelForUser, getAdminImpersonatedBusinessId } from "@/lib/admin";

export async function getCurrentUserAndBusiness() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { user: null, business: null, isAdmin: false, isImpersonating: false };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { user: null, business: null, isAdmin: false, isImpersonating: false };

  const isAdmin = Boolean(getAdminAccessLevelForUser(user));

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
        };
      }
    }
  }

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return { user, business, isAdmin, isImpersonating: false };
}
