"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Global Error]", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex items-center justify-center min-h-screen p-8 bg-background">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Something went wrong</h1>
                            <p className="text-muted-foreground">
                                We encountered an unexpected error. Please try again.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={reset} size="lg">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                            <Button variant="outline" size="lg" asChild>
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" />
                                    Go Home
                                </Link>
                            </Button>
                        </div>
                        {error.digest && (
                            <p className="text-xs text-muted-foreground">
                                Error ID: {error.digest}
                            </p>
                        )}
                    </div>
                </div>
            </body>
        </html>
    );
}
