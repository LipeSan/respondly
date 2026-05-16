import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, parseState } from "@/lib/googleOauth";

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

  await prisma.googleConnection.upsert({
    where: { businessId: parsed.businessId },
    create: {
      businessId: parsed.businessId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? "",
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      expiresAt,
      refreshToken: tokens.refresh_token ? tokens.refresh_token : (existing?.refreshToken ?? ""),
    },
  });

  return NextResponse.redirect(new URL(`/dashboard?google=connected`, url.origin));
}
