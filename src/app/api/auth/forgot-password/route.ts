import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

async function sendEmail(args: { to: string; subject: string; html: string; text: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (resendApiKey && emailFrom) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      throw new Error(raw || `Email send failed (${res.status})`);
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Email not configured. Skipping send.", { to: args.to, subject: args.subject });
  }
}

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

      const subject = "Reset your Respondly password";
      const text = `Use the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`;
      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Reset your password</h2>
          <p style="margin: 0 0 16px;">Click the button below to reset your Respondly password. This link expires in 1 hour.</p>
          <p style="margin: 0 0 16px;">
            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              Reset password
            </a>
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `;

      try {
        await sendEmail({ to: user.email, subject, html, text });
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
