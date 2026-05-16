import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { googleGetForBusiness } from "@/lib/googleClient";

type LocationsList = {
  locations?: Array<{
    name: string; // "locations/123" ou "accounts/xxx/locations/yyy" (depende da API)
    title?: string;
    storefrontAddress?: unknown;
  }>;
  nextPageToken?: string;
};

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const url = new URL(req.url);
  const accountName = url.searchParams.get("account"); // ex: accounts/123
  if (!accountName) return NextResponse.json({ error: "account is required" }, { status: 400 });

  const readMask = "name,title,storefrontAddress";
  const baseV1Url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=${encodeURIComponent(
    readMask
  )}&pageSize=100`;

  try {
    const locations: LocationsList["locations"] = [];
    let pageToken: string | undefined;

    do {
      const pageUrl = pageToken ? `${baseV1Url}&pageToken=${encodeURIComponent(pageToken)}` : baseV1Url;
      const data = await googleGetForBusiness<LocationsList>(business.id, pageUrl);
      locations.push(...(data.locations ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching Google locations:", error);
    const message = String((error as Error)?.message || "");
    const lower = message.toLowerCase();

    const status = lower.includes("quota") ? 429 : lower.includes("reconnect") || lower.includes("expired or revoked") ? 401 : 500;
    return NextResponse.json({ error: message || "Failed to fetch locations" }, { status });
  }
}
