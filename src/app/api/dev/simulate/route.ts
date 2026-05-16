import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { autoRespondBusiness } from "@/lib/reviewEngine";

export async function POST() {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const result = await autoRespondBusiness(business.id);
  return NextResponse.json({ ok: true, result });
}