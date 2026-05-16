import { prisma } from "@/lib/db";
import { googleGetForBusiness, googlePutForBusiness } from "@/lib/googleClient";
import type { ExternalReview } from "./mock";

type GoogleReviewsResponse = {
  reviews?: Array<{
    name: string; // unique review id
    comment?: string;
    starRating?: unknown; // can come as "FIVE"/etc
    reviewer?: { displayName?: string };
    createTime?: string;
  }>;
  nextPageToken?: string;
};

function mapStars(starRating: unknown): number {
  if (typeof starRating === "number") return starRating;
  const m = String(starRating || "").toUpperCase();
  if (m.includes("FIVE")) return 5;
  if (m.includes("FOUR")) return 4;
  if (m.includes("THREE")) return 3;
  if (m.includes("TWO")) return 2;
  if (m.includes("ONE")) return 1;
  return 0;
}

export async function fetchGoogleReviews(businessId: string): Promise<ExternalReview[]> {
  const biz = await prisma.business.findUnique({
    where: { id: businessId },
    select: { googleLocationId: true, googleAccountName: true },
  });
  if (!biz?.googleLocationId) throw new Error("Google location not selected");

  const googleLocationId = String(biz.googleLocationId).replace(/^\/+|\/+$/g, "");
  const googleAccountName = biz.googleAccountName
    ? String(biz.googleAccountName).replace(/^\/+|\/+$/g, "")
    : null;

  const locationPath = googleLocationId.startsWith("accounts/")
    ? googleLocationId
    : googleAccountName && googleLocationId.startsWith("locations/")
      ? `${googleAccountName}/${googleLocationId}`
      : googleLocationId;

  const baseUrl = `https://mybusiness.googleapis.com/v4/${locationPath}/reviews`;
  
  const allReviews: ExternalReview[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url: string = pageToken 
      ? `${baseUrl}?pageToken=${pageToken}`
      : baseUrl;

    const data = await googleGetForBusiness<GoogleReviewsResponse>(businessId, url);
    
    const mapped = (data.reviews ?? []).map((r) => ({
      source: "google" as const,
      externalId: r.name,
      rating: mapStars(r.starRating),
      authorName: r.reviewer?.displayName ?? null,
      comment: r.comment ?? null,
      createdAtGoogle: r.createTime ? new Date(r.createTime) : null,
    }));

    allReviews.push(...mapped);
    pageToken = data.nextPageToken;

  } while (pageToken);

  return allReviews;
}

export async function replyToGoogleReview(businessId: string, reviewName: string, comment: string) {
  const normalized = String(reviewName || "").replace(/^\/+|\/+$/g, "");
  if (!normalized) throw new Error("Missing Google review name");
  const url = `https://mybusiness.googleapis.com/v4/${normalized}/reply`;
  await googlePutForBusiness(businessId, url, { comment });
}
