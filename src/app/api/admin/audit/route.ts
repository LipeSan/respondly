import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin";
import { loadAuditPage, parseAuditFilter } from "@/lib/adminAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = await loadAuditPage({
    filter: parseAuditFilter(url.searchParams.get("filter")),
    businessId: url.searchParams.get("business")?.trim() || null,
    cursor: url.searchParams.get("cursor")?.trim() || null,
  });
  return NextResponse.json(page);
}
