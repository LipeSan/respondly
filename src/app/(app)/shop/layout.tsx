import { notFound } from "next/navigation";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

// Shop is admin-only until it launches for customers.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getCurrentUserAndBusiness();
  if (!isAdmin) notFound();
  return children;
}
