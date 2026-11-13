import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Prisma } from "@prisma/client";
import { canUseAI, getBusinessPlan } from "@/lib/plan";
import { recordCustomerActivity } from "@/lib/activity";

export async function GET() {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: business.id },
    select: { plan: true, status: true },
  });

  return NextResponse.json({
    autoResponderEnabled: business.autoResponderEnabled,
    aiSettings: business.aiSettings ?? null,
    subscription,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function PUT(req: Request) {
  const { business, user, isImpersonating } = await getCurrentUserAndBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const body = await req.json();

  const data: {
    autoResponderEnabled?: boolean;
    aiSettings?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "autoResponderEnabled")) {
    data.autoResponderEnabled = Boolean(body.autoResponderEnabled);
    if (data.autoResponderEnabled && !business.googleLocationId) {
      return NextResponse.json(
        { error: "Connect your Google Business Profile before turning on auto-replies.", code: "GOOGLE_NOT_CONNECTED" },
        { status: 400 },
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "aiSettings")) {
    const plan = await getBusinessPlan(business.id);
    const canEditAi = canUseAI(plan.plan);

    if (!canEditAi) {
      return NextResponse.json({ error: "AI settings are available only on the Pro plan" }, { status: 403 });
    }

    if (body.aiSettings === null) {
      data.aiSettings = Prisma.DbNull;
    } else if (typeof body.aiSettings === "object") {
      data.aiSettings = body.aiSettings as Prisma.InputJsonValue;
    } else {
      return NextResponse.json({ error: "aiSettings must be an object or null" }, { status: 400 });
    }
  }

  const updated = await prisma.business.update({
    where: { id: business.id },
    data,
    select: { autoResponderEnabled: true, aiSettings: true },
  });

  // Auto-replies are the paid feature; log every on/off switch so a business
  // that silently isn't being automated can be traced back to who changed it.
  const activityCtx = { user, business, isImpersonating };
  if (updated.autoResponderEnabled !== business.autoResponderEnabled) {
    await recordCustomerActivity(
      activityCtx,
      updated.autoResponderEnabled ? "auto_responder_enabled" : "auto_responder_disabled",
    );
  }
  if ("aiSettings" in data) {
    await recordCustomerActivity(activityCtx, "ai_settings_updated");
  }

  return NextResponse.json(updated);
}
