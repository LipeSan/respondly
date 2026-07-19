import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { AdminImpersonationBar } from "@/components/AdminImpersonationBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, business, isAdmin, isImpersonating } = await getCurrentUserAndBusiness();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        businessName={business?.name}
        userName={user?.name ?? undefined}
        userEmail={user?.email ?? undefined}
        isAdmin={isAdmin}
      />
      {isAdmin && isImpersonating && business?.name ? (
        <AdminImpersonationBar businessName={business.name} />
      ) : null}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <Sidebar />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
