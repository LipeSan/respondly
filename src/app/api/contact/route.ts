import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const descriptionRaw = typeof body?.description === "string" ? body.description : "";

  const email = emailRaw.trim();
  const description = descriptionRaw.trim();

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!email.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });

  await prisma.contactMessage.create({
    data: {
      email,
      description,
    },
  });

  return NextResponse.json({ ok: true });
}

