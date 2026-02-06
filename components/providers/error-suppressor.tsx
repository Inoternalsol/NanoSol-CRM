"use client";

import { useEffect } from "react";

export function ErrorSuppressor() {
    useEffect(() => {
        // Only run in browser
        if (typeof window === "undefined") return;

        const originalError = console.error;
        console.error = (...args) => {
            // Suppress the specific React DevTools error
            if (
                (typeof args[0] === "string" && args[0].includes("cleaning up async info")) ||
                (typeof args[0] === "string" && args[0].includes("chrome-extension://")) ||
                (typeof args[0] === "string" && args[0].includes("cleaning up async info that was not on the parent Suspense boundary"))
            ) {
                return;
            }
            originalError.apply(console, args);
        };

        return () => {
            console.error = originalError;
        };
    }, []);

    return null;
}
