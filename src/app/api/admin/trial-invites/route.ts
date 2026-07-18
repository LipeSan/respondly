import { NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(req: Request) {
  const secret = process.env.TRIAL_INVITES_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const provided = req.headers.get("x-trial-invites-secret") ?? "";
  return provided === secret;
}

function generateCode() {
  const raw = crypto.randomBytes(12).toString("base64url").replace(/[-_]/g, "").toUpperCase();
  return raw.slice(0, 12);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const url = new URL(req.url);
  const takeRaw = Number(url.searchParams.get("take") ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 200) : 50;

  const invites = await prisma.trialInvite.findMany({
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      days: true,
      email: true,
      reservedAt: true,
      reservedByUserId: true,
      reservedByBusinessId: true,
      usedAt: true,
      usedByBusinessId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const daysRaw = typeof body?.days === "number" ? body.days : Number(body?.days ?? NaN);
  const days = Number.isFinite(daysRaw) ? Math.floor(daysRaw) : NaN;

  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase() || null;

  const codeRaw = typeof body?.code === "string" ? body.code : "";
  const requestedCode = codeRaw.trim().toUpperCase() || null;

  if (!Number.isFinite(days) || days <= 0 || days > 365) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }
  if (email && !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (requestedCode && requestedCode.length < 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const maxAttempts = requestedCode ? 1 : 5;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = requestedCode ?? generateCode();
    try {
      const invite = await prisma.trialInvite.create({
        data: { code, days, email },
        select: {
          id: true,
          code: true,
          days: true,
          email: true,
          reservedAt: true,
          usedAt: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ invite });
    } catch (e) {
      lastError = e;
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        if (requestedCode) {
          return NextResponse.json({ error: "Code already exists" }, { status: 409 });
        }
        continue;
      }
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const msg = lastError instanceof Error ? lastError.message : "Failed to generate unique code";
  return NextResponse.json({ error: msg }, { status: 500 });
}

