import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentAdminUser } from "@/lib/admin";
import { NavigationLoadingArea } from "@/components/LoadingOverlay";
import { AdminNav } from "./AdminNav";

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
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header and nav are hidden when printing, e.g. shipping labels. */}
      <div className="print:hidden">
        <Header
          userName={adminContext.user.name ?? undefined}
          userEmail={adminContext.user.email}
          isAdmin
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8 lg:px-8 print:block print:p-0">
        <aside className="mb-6 lg:mb-0 print:hidden">
          <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 lg:block">
            Admin · {adminContext.accessLevel}
          </p>
          <div className="lg:sticky lg:top-8">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0">
          <NavigationLoadingArea>{children}</NavigationLoadingArea>
        </main>
      </div>
    </div>
  );
}
