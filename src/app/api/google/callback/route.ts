import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, parseState } from "@/lib/googleOauth";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { recordCustomerActivity } from "@/lib/activity";
import { decryptToken, encryptToken } from "@/lib/tokenCrypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL(`/dashboard?google=error:${error}`, url.origin));
  if (!code || !state) return NextResponse.json({ error: "Missing code/state" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Google OAuth env not set" }, { status: 500 });
  }

  const parsed = parseState(state) as { businessId: string; ts: number };
  const tokens = await exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri });

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // upsert connection
  // refresh_token may be empty on re-consent; keep the previous one if it exists
  const existing = await prisma.googleConnection.findUnique({
    where: { businessId: parsed.businessId },
  });

  const accessToken = encryptToken(tokens.access_token);
  const refreshToken = encryptToken(
    tokens.refresh_token || (existing ? decryptToken(existing.refreshToken) : ""),
  );

  await prisma.googleConnection.upsert({
    where: { businessId: parsed.businessId },
    create: {
      businessId: parsed.businessId,
      accessToken,
      refreshToken,
      expiresAt,
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
    },
  });

  const ctx = await getCurrentUserAndBusiness();
  if (ctx.business?.id === parsed.businessId) {
    await recordCustomerActivity(ctx, "google_connected");
  }

  return NextResponse.redirect(new URL(`/dashboard?google=connected`, url.origin));
}
