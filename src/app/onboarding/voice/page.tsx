import { redirect } from "next/navigation";

// The onboarding entry point reuses the settings page — a dedicated multi-step
// wizard is a separate UX iteration. If the user already has a BrandVoice,
// land them on settings anyway so they can review.
export default function OnboardingVoiceRedirect() {
  redirect("/dashboard/settings/voice");
}
