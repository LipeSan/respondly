import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { getCurrentAdminUser } from "@/lib/admin";
import { autoRespondBusiness } from "@/lib/reviewEngine";

// Manual trigger for local debugging. Not wired into any UI — restricted to
// non-production environments or admins so it can't be used by regular
// customers to run the automation on demand outside the cron schedule.
export async function POST() {
  const isDev = process.env.NODE_ENV !== "production";
  const adminContext = isDev ? null : await getCurrentAdminUser();
  if (!isDev && !adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { business } = await getCurrentUserAndBusiness();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

  const result = await autoRespondBusiness(business.id);
  return NextResponse.json({ ok: true, result });
}