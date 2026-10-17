// Shared by the admin UI (to prefill the composer) and the admin email API
// (to validate the CTA), so it must stay free of server-only imports.

export type OnboardingStage = "no_business" | "no_google" | "no_subscription" | "complete";

export type AdminEmailCtaPath = "/onboarding" | "/google" | "/subscription" | "/dashboard";

export const adminEmailCtas: Record<AdminEmailCtaPath, string> = {
  "/onboarding": "Finish setup",
  "/google": "Connect Google",
  "/subscription": "Choose a plan",
  "/dashboard": "Open Respondly",
};

export function isAdminEmailCtaPath(value: unknown): value is AdminEmailCtaPath {
  return typeof value === "string" && value in adminEmailCtas;
}

export function getOnboardingStage(args: {
  hasBusiness: boolean;
  hasGoogle: boolean;
  hasSubscription: boolean;
}): OnboardingStage {
  if (!args.hasBusiness) return "no_business";
  if (!args.hasGoogle) return "no_google";
  if (!args.hasSubscription) return "no_subscription";
  return "complete";
}

export const onboardingStageLabels: Record<OnboardingStage, string> = {
  no_business: "Onboarding not started",
  no_google: "Google not connected",
  no_subscription: "No plan selected",
  complete: "Setup complete",
};

export type AdminEmailPreset = {
  subject: string;
  message: string;
  ctaPath: AdminEmailCtaPath | null;
};

export function getAdminEmailPreset(stage: OnboardingStage, name?: string | null): AdminEmailPreset {
  const greeting = `Hi ${name?.trim() || "there"},`;
  const signOff = "Cheers,\nThe Respondly team";

  switch (stage) {
    case "no_business":
      return {
        subject: "Finish setting up your Respondly account",
        message:
          `${greeting}\n\n` +
          "Thanks for signing up to Respondly! It looks like you haven't finished setting up your business yet. " +
          "It only takes a couple of minutes, and then Respondly can start replying to your Google reviews for you.\n\n" +
          "If something got in the way, just reply to this email and we'll help you get set up.\n\n" +
          signOff,
        ctaPath: "/onboarding",
      };
    case "no_google":
      return {
        subject: "One step left: connect your Google Business Profile",
        message:
          `${greeting}\n\n` +
          "Your Respondly account is almost ready. The last step is connecting your Google Business Profile " +
          "so we can sync your reviews and start replying to them.\n\n" +
          "If you had any trouble connecting Google, just reply to this email and we'll walk you through it.\n\n" +
          signOff,
        ctaPath: "/google",
      };
    case "no_subscription":
      return {
        subject: "Start automating your Google review replies",
        message:
          `${greeting}\n\n` +
          "Your Google Business Profile is connected to Respondly. Choose a plan to turn on automatic replies " +
          "and stop answering every review by hand.\n\n" +
          "Have questions about the plans? Just reply to this email.\n\n" +
          signOff,
        ctaPath: "/subscription",
      };
    case "complete":
      return {
        subject: "",
        message: `${greeting}\n\n\n\n${signOff}`,
        ctaPath: null,
      };
  }
}
