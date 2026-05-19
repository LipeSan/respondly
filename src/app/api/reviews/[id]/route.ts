import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { replyToGoogleReview } from "@/lib/reviews/providers/google";

export async function GET(
  _: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const review = await prisma.review.findFirst({
    where: { id: params.id, businessId: business.id },
    include: {
      response: true,
    },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shaped = {
    ...review,
    responses: review.response ? [review.response] : [],
    response: undefined,
  };

  return NextResponse.json({ review: shaped });
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const requestedFinalTextRaw = typeof body?.finalText === "string" ? body.finalText : null;
  const requestedFinalText = requestedFinalTextRaw ? requestedFinalTextRaw.trim() : null;

  const review = await prisma.review.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { response: true },
  });

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!review.response) {
    return NextResponse.json({ error: "No response to publish" }, { status: 400 });
  }
  if (review.response.sentAt) {
    return NextResponse.json({ ok: true, alreadyPublished: true });
  }

  try {
    const finalTextToSend = requestedFinalText || review.response.finalText;
    if (!finalTextToSend.trim()) {
      return NextResponse.json({ error: "finalText is required" }, { status: 400 });
    }

    if (review.source === "google") {
      if (!review.externalId) {
        return NextResponse.json({ error: "Missing Google review id" }, { status: 400 });
      }
      await replyToGoogleReview(business.id, review.externalId, finalTextToSend);
    }

    await prisma.$transaction([
      prisma.reviewResponse.update({
        where: { reviewId: review.id },
        data: {
          sentAt: new Date(),
          ...(requestedFinalText ? { finalText: finalTextToSend } : null),
        },
      }),
      prisma.review.update({
        where: { id: review.id },
        data: { status: "responded", lastError: null },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    await prisma.review.update({
      where: { id: review.id },
      data: { status: "failed", lastError: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
