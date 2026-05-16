import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { syncReviewsForBusiness } from "@/lib/reviews/sync";

const API_VERSION = 1;

export async function GET() {
  return NextResponse.json(
    {
      apiVersion: API_VERSION,
      error:
        "Method not allowed. Use POST with { accountName, locationName, locationTitle } to save the Google location and run the initial sync.",
    },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ apiVersion: API_VERSION, error: "No business" }, { status: 400 });

  const body = await req.json();
  const accountName = String(body.accountName ?? "").trim(); // "accounts/123"
  const locationName = String(body.locationName ?? "").trim(); // "accounts/123/locations/456" ou "locations/456"
  const locationTitle = body.locationTitle ? String(body.locationTitle).trim() : null;

  if (!accountName || !locationName) {
    return NextResponse.json({ apiVersion: API_VERSION, error: "accountName and locationName are required" }, { status: 400 });
  }

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: {
      googleAccountName: accountName,
      googleLocationId: locationName,
      googleLocationName: locationTitle ?? undefined,
    },
    select: {
      id: true,
      googleAccountName: true,
      googleLocationId: true,
      googleLocationName: true,
    },
  });

  try {
    const sync = await syncReviewsForBusiness(business.id, { source: "google" });
    return NextResponse.json({ apiVersion: API_VERSION, business: updated, sync });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ apiVersion: API_VERSION, business: updated, error: message }, { status: 500 });
  }
}
