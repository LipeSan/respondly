import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildProductInfoEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const secret = process.env.MARKETING_EMAIL_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const provided = req.headers.get("x-marketing-secret") ?? "";
  return provided === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const nameRaw = typeof body?.name === "string" ? body.name : "";

  const email = emailRaw.toLowerCase().trim();
  const name = nameRaw.trim();

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!email.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  const registerUrl = `${origin}/register?utm_source=outreach&utm_medium=email&utm_campaign=product_info`;

  const content = buildProductInfoEmail({ name: name || null, registerUrl });
  await sendEmail({ to: email, ...content });

  return NextResponse.json({ ok: true });
}

