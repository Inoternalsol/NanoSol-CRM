"use client";

import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LandingPageContent = nextDynamic(
  () => import("@/components/landing/landing-page"),
  { ssr: false }
);

export default function LandingPage() {
  return <LandingPageContent />;
}
