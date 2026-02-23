"use client";

import { useEffect } from "react";

export function ErrorSuppressor() {
    useEffect(() => {
        // Only run in browser
        if (typeof window === "undefined") return;

        const originalError = console.error;
        console.error = (...args) => {
            const errorString = args.map(a =>
                typeof a === 'string' ? a :
                    a instanceof Error ? a.message + a.stack :
                        JSON.stringify(a)
            ).join(' ');

            if (
                errorString.includes("cleaning up async info") ||
                errorString.includes("chrome-extension://") ||
                errorString.includes("postUserData") ||
                errorString.includes("sevendata.fun") ||
                errorString.includes("secdomcheck.online")
            ) {
                return;
            }
            originalError.apply(console, args);
        };

        return () => {
            console.error = originalError;
        };
    }, []);

    useEffect(() => {
        const maliciousDomains = [
            "sevendata.fun",
            "secdomcheck.online"
        ];

        const originalFetch = window.fetch;
        window.fetch = async function (...args: Parameters<typeof fetch>) {
            const [input] = args;
            const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : '');

            if (maliciousDomains.some(domain => url.includes(domain))) {
                console.warn(`[Blocked] Prevented fetch to malicious domain: ${url}`);
                return new Response(null, { status: 200 });
            }

            try {
                return await originalFetch.apply(this, args);
            } catch (err: any) {
                if (err?.message === "Failed to fetch" || err?.name === "TypeError") {
                    console.error(`[Fetch Failure] Failed to reach: ${url}`, {
                        args,
                        error: err
                    });
                }
                throw err;
            }
        };

        const handler = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const context = typeof reason === 'object' ?
                (reason?.message || '') + (reason?.stack || '') :
                String(reason);

            if (
                context.includes("postUserData") ||
                maliciousDomains.some(domain => context.includes(domain)) ||
                context.includes("Blocked by ErrorSuppressor")
            ) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const errorHandler = (event: ErrorEvent) => {
            const context = (event.message || '') + (event.error?.stack || '');
            if (
                context.includes("postUserData") ||
                maliciousDomains.some(domain => context.includes(domain)) ||
                context.includes("Blocked by ErrorSuppressor")
            ) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener("unhandledrejection", handler, true);
        window.addEventListener("error", errorHandler, true);
        return () => {
            window.fetch = originalFetch;
            window.removeEventListener("unhandledrejection", handler, true);
            window.removeEventListener("error", errorHandler, true);
        };
    }, []);

    return null;
}
