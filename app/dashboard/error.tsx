"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("[Dashboard Error]", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle>Something went wrong</CardTitle>
                    <CardDescription>
                        An error occurred while loading this page. Don&apos;t worry, your data is safe.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {process.env.NODE_ENV === "development" && (
                        <div className="p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-32">
                            {error.message}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={reset} className="flex-1">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                        <Button variant="outline" className="flex-1" asChild>
                            <a href="/dashboard">
                                <Home className="mr-2 h-4 w-4" />
                                Go Home
                            </a>
                        </Button>
                    </div>
                    {error.digest && (
                        <p className="text-[10px] text-center text-muted-foreground">
                            Error ID: {error.digest}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
