import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getCurrentUserAndBusiness() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { user: null, business: null };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { user: null, business: null };

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return { user, business };
}