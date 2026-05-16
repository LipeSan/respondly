import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Prisma, ReviewStatus } from "@prisma/client";

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // pending | responded | failed | skipped | all
  const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

  const where: Prisma.ReviewWhereInput = { businessId: business.id };
  if (status && status !== "all") {
    if (
      status === ReviewStatus.pending ||
      status === ReviewStatus.responded ||
      status === ReviewStatus.failed ||
      status === ReviewStatus.skipped
    ) {
      where.status = status;
    }
  }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      response: true,
    },
  });

  const shaped = reviews.map((r) => ({
    ...r,
    responses: r.response ? [r.response] : [],
    response: undefined,
  }));

  return NextResponse.json({ reviews: shaped });
}
