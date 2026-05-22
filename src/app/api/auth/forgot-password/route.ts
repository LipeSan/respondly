import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildResetPasswordEmail } from "@/lib/email/templates";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = String((body as { email?: unknown } | null)?.email ?? "")
    .toLowerCase()
    .trim();

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  let devResetUrl: string | undefined = undefined;

  if (user) {
    try {
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = sha256Hex(token);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      if (process.env.NODE_ENV !== "production") devResetUrl = resetUrl;
      const content = buildResetPasswordEmail({ resetUrl });

      try {
        await sendEmail({ to: user.email, ...content });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Forgot password email send failed", err);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Forgot password token create failed", err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for this email, you'll receive a password reset link shortly.",
    ...(devResetUrl ? { devResetUrl } : {}),
  });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Forgot password handler failed", err);
    }
    return NextResponse.json({
      ok: true,
      message: "If an account exists for this email, you'll receive a password reset link shortly.",
    });
  }
}
