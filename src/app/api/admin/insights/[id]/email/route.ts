import { NextResponse } from "next/server";
import { getCurrentAdminUser, recordAdminAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { buildInsightReportEmailFor, sendInsightReportEmail } from "@/lib/insights/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireFullAdmin() {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (adminContext.accessLevel !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { adminContext };
}

/** Preview: the exact HTML the customer would get, without sending it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireFullAdmin();
  if (error) return error;

  const { id } = await params;
  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  try {
    const { content } = await buildInsightReportEmailFor(id, origin);
    return new NextResponse(content.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Preview failed" }, { status: 400 });
  }
}

/** Sends the report email. Re-sending an already emailed report needs `resend: true`. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { adminContext, error } = await requireFullAdmin();
  if (error) return error;

  // sendEmail silently skips when email isn't configured; fail loudly here so
  // the admin isn't told a message went out when it didn't.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const insight = await prisma.reviewInsight.findUnique({ where: { id }, select: { status: true, emailedAt: true } });
  if (!insight) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (insight.status !== "ready") {
    return NextResponse.json({ error: "Only ready reports can be emailed" }, { status: 400 });
  }
  if (insight.emailedAt && body.resend !== true) {
    return NextResponse.json({ error: "This report was already emailed" }, { status: 409 });
  }

  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  try {
    const result = await sendInsightReportEmail(id, origin);
    await recordAdminAudit({
      actorUserId: adminContext.user.id,
      action: "insight_report_emailed",
      targetBusinessId: result.businessId,
      metadata: { insightId: id, to: result.to, resend: Boolean(insight.emailedAt) },
    });
    return NextResponse.json({ ok: true, to: result.to, emailedAt: result.emailedAt.toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin:insight-email] send failed", { insightId: id, error: message });
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
}
