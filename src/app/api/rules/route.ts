import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

type RuleMode = "auto" | "manual";
type ResponseMethod = "template" | "ai" | "manual";

function parseRuleMode(v: unknown): RuleMode {
  return v === "manual" ? "manual" : "auto";
}

function parseResponseMethod(v: unknown): ResponseMethod {
  if (v === "ai") return "ai";
  if (v === "manual") return "manual";
  return "template";
}

export async function GET() {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const rules = await prisma.reviewRule.findMany({
    where: { businessId: business.id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: { template: true },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const body = await req.json();

  const priority = Number(body.priority ?? 100);
  const minStars = body.minStars === null || body.minStars === undefined ? null : Number(body.minStars);
  const maxStars = body.maxStars === null || body.maxStars === undefined ? null : Number(body.maxStars);

  const mode = parseRuleMode(body.mode);
  const responseType = parseResponseMethod(body.responseType);
  const templateId = body.templateId ? String(body.templateId) : null;

  if (Number.isNaN(priority)) {
    return NextResponse.json({ error: "priority must be a number" }, { status: 400 });
  }

  if ((minStars != null && (minStars < 1 || minStars > 5)) || (maxStars != null && (maxStars < 1 || maxStars > 5))) {
    return NextResponse.json({ error: "stars must be between 1 and 5" }, { status: 400 });
  }

  if (minStars != null && maxStars != null && minStars > maxStars) {
    return NextResponse.json({ error: "minStars cannot be greater than maxStars" }, { status: 400 });
  }

  if (responseType === "template" && !templateId) {
    return NextResponse.json({ error: "templateId is required for template rules" }, { status: 400 });
  }

  const rule = await prisma.reviewRule.create({
    data: {
      businessId: business.id,
      priority,
      minStars: minStars ?? undefined,
      maxStars: maxStars ?? undefined,
      mode,
      responseType,
      templateId: responseType === "template" ? (templateId ?? undefined) : null,
    },
    include: { template: true },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

export async function PUT(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const body = await req.json();

  const id = String(body.id ?? "").trim();
  const priority = Number(body.priority ?? 100);
  const minStars = body.minStars === null || body.minStars === undefined ? null : Number(body.minStars);
  const maxStars = body.maxStars === null || body.maxStars === undefined ? null : Number(body.maxStars);

  const mode = parseRuleMode(body.mode);
  const responseType = parseResponseMethod(body.responseType);
  const templateId = body.templateId ? String(body.templateId) : null;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if ((minStars != null && (minStars < 1 || minStars > 5)) || (maxStars != null && (maxStars < 1 || maxStars > 5))) {
    return NextResponse.json({ error: "stars must be between 1 and 5" }, { status: 400 });
  }

  if (minStars != null && maxStars != null && minStars > maxStars) {
    return NextResponse.json({ error: "minStars cannot be greater than maxStars" }, { status: 400 });
  }

  if (responseType === "template" && !templateId) {
    return NextResponse.json({ error: "templateId is required for template rules" }, { status: 400 });
  }

  const updated = await prisma.reviewRule.updateMany({
    where: { id, businessId: business.id },
    data: {
      priority,
      minStars: minStars ?? undefined,
      maxStars: maxStars ?? undefined,
      mode,
      responseType,
      templateId: responseType === "template" ? (templateId ?? undefined) : null,
    },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await prisma.reviewRule.deleteMany({
    where: { id, businessId: business.id },
  });

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
