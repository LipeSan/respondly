import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Prisma, ResponseMethod, RuleMode } from "@prisma/client";

function parseNullableInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n;
}

function parseRuleMode(v: unknown): RuleMode {
  return v === RuleMode.manual ? RuleMode.manual : RuleMode.auto;
}

function parseResponseMethod(v: unknown): ResponseMethod {
  if (v === ResponseMethod.ai) return ResponseMethod.ai;
  if (v === ResponseMethod.manual) return ResponseMethod.manual;
  return ResponseMethod.template;
}

function validateStars(minStars: number | null, maxStars: number | null) {
  const inRange = (n: number) => n >= 1 && n <= 5;

  if (minStars != null && !inRange(minStars)) return "minStars must be between 1 and 5";
  if (maxStars != null && !inRange(maxStars)) return "maxStars must be between 1 and 5";
  if (minStars != null && maxStars != null && minStars > maxStars)
    return "minStars cannot be greater than maxStars";

  return null;
}

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode"); // auto | manual (optional)

  const where: Prisma.ReviewRuleWhereInput = { businessId: business.id };
  if (mode) where.mode = parseRuleMode(mode);

  const rules = await prisma.reviewRule.findMany({
    where,
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
  if (Number.isNaN(priority)) {
    return NextResponse.json({ error: "priority must be a number" }, { status: 400 });
  }

  const minStars = parseNullableInt(body.minStars);
  const maxStars = parseNullableInt(body.maxStars);

  const mode = parseRuleMode(body.mode);
  const responseType = parseResponseMethod(body.responseType);
  const templateId = body.templateId ? String(body.templateId) : null;

  const starsError = validateStars(minStars, maxStars);
  if (starsError) return NextResponse.json({ error: starsError }, { status: 400 });

  if (responseType === "template" && !templateId) {
    return NextResponse.json({ error: "templateId is required for template rules" }, { status: 400 });
  }

  // (opcional) validar se template existe e pertence ao business
  if (templateId) {
    const t = await prisma.reviewTemplate.findFirst({
      where: { id: templateId, businessId: business.id },
      select: { id: true },
    });
    if (!t) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const rule = await prisma.reviewRule.create({
    data: {
      businessId: business.id,
      priority,
      minStars: minStars ?? undefined,
      maxStars: maxStars ?? undefined,
      mode,
      responseType,
      templateId: responseType === ResponseMethod.template ? (templateId ?? undefined) : null,
    },
    include: { template: true },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
