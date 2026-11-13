import Link from "next/link";
import { prisma } from "@/lib/db";
import { AUDIT_FILTERS, type AuditFilter, loadAuditPage, parseAuditFilter } from "@/lib/adminAudit";
import { PageHeader } from "../ui";
import { AuditCustomerSelect, AuditLogTable } from "./AuditLogTable";
import { buildAuditHref } from "./href";

export const dynamic = "force-dynamic";

const filterLabels: Record<AuditFilter, string> = { all: "All", customers: "Customer actions", admin: "Admin actions" };

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; business?: string }>;
}) {
  const params = await searchParams;
  const filter = parseAuditFilter(params.filter);
  const businessId = params.business?.trim() || null;

  const [initialPage, businesses] = await Promise.all([
    loadAuditPage({ filter, businessId }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Customer sign-ins and changes, plus admin actions. Newest first." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {AUDIT_FILTERS.map((f) => (
            <FilterChip key={f} href={buildAuditHref(f, businessId)} active={filter === f}>
              {filterLabels[f]}
            </FilterChip>
          ))}
        </div>
        <AuditCustomerSelect filter={filter} businessId={businessId} businesses={businesses} />
      </div>

      {/* key resets the loaded pages whenever the filters change. */}
      <AuditLogTable
        key={`${filter}:${businessId ?? ""}`}
        initialPage={initialPage}
        filter={filter}
        businessId={businessId}
      />
    </div>
  );
}
