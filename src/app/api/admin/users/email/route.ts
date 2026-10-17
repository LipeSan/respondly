import { NextResponse } from "next/server";
import { recordAdminAudit, getCurrentAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildAdminMessageEmail } from "@/lib/email/templates";
import { adminEmailCtas, isAdminEmailCtaPath } from "@/lib/email/adminEmailPresets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (adminContext.accessLevel !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // sendEmail silently skips when email isn't configured; fail loudly here so
  // the admin isn't told a message went out when it didn't.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const ctaPath: unknown = body.ctaPath ?? null;

  if (!userId || !subject || !message) {
    return NextResponse.json({ error: "userId, subject and message are required" }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Subject or message is too long" }, { status: 400 });
  }
  if (ctaPath !== null && !isAdminEmailCtaPath(ctaPath)) {
    return NextResponse.json({ error: "Invalid button link" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      businesses: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
    },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  const content = buildAdminMessageEmail({
    subject,
    message,
    origin,
    cta: ctaPath ? { label: adminEmailCtas[ctaPath], url: `${origin}${ctaPath}` } : null,
  });

  try {
    await sendEmail({
      to: targetUser.email,
      ...content,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[admin:email] send failed", { userId: targetUser.id, error: errorMessage });
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }

  await recordAdminAudit({
    actorUserId: adminContext.user.id,
    action: "user_email_sent",
    targetUserId: targetUser.id,
    targetBusinessId: targetUser.businesses[0]?.id ?? null,
    metadata: { subject, ctaPath },
  });

  return NextResponse.json({ ok: true, sentAt: new Date().toISOString() });
}
