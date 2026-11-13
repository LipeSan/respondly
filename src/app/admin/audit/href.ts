import type { AuditFilter } from "@/lib/adminAudit";

export function buildAuditHref(filter: AuditFilter, businessId: string | null) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (businessId) params.set("business", businessId);
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}
