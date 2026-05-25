"use client";

import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const SignupContent = nextDynamic(() => import("./signup-content"), { ssr: false });

export default function SignupPage() {
    return <SignupContent />;
}
