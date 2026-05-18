import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

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

  const token = String((body as { token?: unknown } | null)?.token ?? "").trim();
  const password = String((body as { password?: unknown } | null)?.password ?? "");

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ ok: false, error: "Password is required" }, { status: 400 });
  }

  const tokenHash = sha256Hex(token);
  const now = new Date();

  const reset = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, userId: true },
  });

  if (!reset) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Reset password handler failed", err);
    }
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }
}
