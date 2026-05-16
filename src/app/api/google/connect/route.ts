import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { buildAuthUrl, makeState } from "@/lib/googleOauth";

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Google OAuth env not set" }, { status: 500 });
  }

  const state = makeState({
    businessId: business.id,
    ts: Date.now(),
  });

  const url = buildAuthUrl({ clientId, redirectUri, state });

  const debug = new URL(req.url).searchParams.get("debug");
  if (debug === "1") {
    return NextResponse.json({ url, redirectUri });
  }

  return NextResponse.redirect(url);
}
