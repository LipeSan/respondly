import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoRespondBusiness } from "@/lib/reviewEngine";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  // ✅ security: secret in the header
  const secret = process.env.JOBS_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "JOBS_SECRET is not set" },
      { status: 500 }
    );
  }

  const header = req.headers.get("x-job-secret");
  if (!header || header !== secret) return unauthorized();

  // (optional) limit how many businesses to process per run
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

  const businesses = await prisma.business.findMany({
    where: { autoResponderEnabled: true },
    select: { id: true, name: true },
    take,
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  let totalResponded = 0;
  let totalSkipped = 0;

  for (const b of businesses) {
    const r = await autoRespondBusiness(b.id);
    results.push({
      businessId: b.id,
      businessName: b.name,
      ...r,
    });
    totalResponded += r.responded;
    totalSkipped += r.skipped;
  }

  return NextResponse.json({
    ok: true,
    processedBusinesses: businesses.length,
    totalResponded,
    totalSkipped,
    results,
    ranAt: new Date().toISOString(),
  });
}
