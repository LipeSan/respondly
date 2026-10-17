import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/date";
import { Card, PageHeader, formatAuditAction, formatRelative } from "../ui";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
      actorUser: { select: { name: true, email: true, role: true } },
      targetUser: { select: { name: true, email: true } },
      targetBusiness: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Admin actions and auto-reply switches, latest 200." />
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">When</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">By</th>
                <th scope="col" className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No audit events yet.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = (log.metadata ?? {}) as Record<string, unknown>;
                  const details =
                    typeof meta.subject === "string"
                      ? `“${meta.subject}”`
                      : typeof meta.nextRole === "string"
                        ? `${String(meta.previousRole)} → ${meta.nextRole}`
                        : meta.viaImpersonation === true
                          ? "While viewing as customer"
                          : "";
                  return (
                    <tr key={log.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-6 py-3 text-gray-600" title={formatDateTime(log.createdAt)}>
                        {formatRelative(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatAuditAction(log.action)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.targetBusiness ? (
                          <Link href={`/admin/businesses/${log.targetBusiness.id}`} className="hover:underline">
                            {log.targetBusiness.name}
                          </Link>
                        ) : (
                          log.targetUser?.email ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.actorUser.name || log.actorUser.email}
                        <span className="text-gray-400"> · {log.actorUser.role}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{details || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
