import { PageHeader } from "../ui";
import { AdminCustomersTable, type CustomerFilter, type SortDir, type SortKey } from "./AdminCustomersTable";

const validFilters: CustomerFilter[] = ["all", "attention", "active", "trial", "canceled", "incomplete"];
const validSortKeys: SortKey[] = ["customer", "plan", "health", "lastSync", "autoReplies", "reviews", "created"];

/** `?sort=health:desc`; defaults to newest customers first. */
function parseSort(raw: string | undefined): { key: SortKey; dir: SortDir } {
  const [key, dir] = (raw ?? "").split(":");
  if (validSortKeys.includes(key as SortKey) && (dir === "asc" || dir === "desc")) {
    return { key: key as SortKey, dir };
  }
  return { key: "created", dir: "desc" };
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const { filter, sort } = await searchParams;
  const initialFilter = validFilters.includes(filter as CustomerFilter) ? (filter as CustomerFilter) : "all";

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Every business, its plan and whether automation is working." />
      <AdminCustomersTable initialFilter={initialFilter} initialSort={parseSort(sort)} />
    </div>
  );
}
