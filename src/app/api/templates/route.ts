import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

export async function GET() {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const templates = await prisma.reviewTemplate.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const bodyText = String(body.body ?? "").trim();

  if (!name || !bodyText) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const template = await prisma.reviewTemplate.create({
    data: { businessId: business.id, name, body: bodyText },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function PUT(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const bodyText = String(body.body ?? "").trim();

  if (!id || !name || !bodyText) {
    return NextResponse.json({ error: "id, name and body are required" }, { status: 400 });
  }

  const template = await prisma.reviewTemplate.updateMany({
    where: { id, businessId: business.id },
    data: { name, body: bodyText },
  });

  if (template.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // evita deletar se tiver regra usando
  const rulesUsing = await prisma.reviewRule.count({
    where: { businessId: business.id, templateId: id },
  });

  if (rulesUsing > 0) {
    return NextResponse.json(
      { error: "Template is being used by rules. Remove rules first." },
      { status: 409 }
    );
  }

  const deleted = await prisma.reviewTemplate.deleteMany({
    where: { id, businessId: business.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
