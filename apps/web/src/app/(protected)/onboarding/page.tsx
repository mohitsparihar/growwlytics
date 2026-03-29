import { Suspense } from "react";
import OnboardingPage from "./onboarding-client";

function OnboardingFallback() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function OnboardingRoutePage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingPage />
    </Suspense>
  );
}
