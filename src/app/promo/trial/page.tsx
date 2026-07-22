import { Suspense } from "react";
import { PromoTrialContent } from "@/app/promo/trial/PromoTrialContent";

export default function PromoTrialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PromoTrialContent />
    </Suspense>
  );
}
