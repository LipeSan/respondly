import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: passwordHash, name },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user });
}