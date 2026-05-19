import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { syncReviewsForBusiness } from "@/lib/reviews/sync";

export async function POST(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const source = body?.source as "google" | "mock" | undefined;

  try {
    const result = await syncReviewsForBusiness(business.id, { source });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
