import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentAdminUser } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userName={adminContext.user.name ?? undefined}
        userEmail={adminContext.user.email}
        isAdmin
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
