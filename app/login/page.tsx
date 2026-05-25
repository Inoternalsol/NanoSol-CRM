"use client";

import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LoginContent = nextDynamic(
    () => import("./login-content"),
    { ssr: false }
);

export default function LoginPage() {
    return <LoginContent />;
}
