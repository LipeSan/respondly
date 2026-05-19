import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, business } = await getCurrentUserAndBusiness();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header businessName={business?.name} userName={user?.name ?? undefined} userEmail={user?.email ?? undefined} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
