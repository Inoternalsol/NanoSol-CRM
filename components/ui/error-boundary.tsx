"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary] Error in ${this.props.name || "component"}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-500/20 rounded-xl bg-red-500/5 text-center space-y-4">
                    <div className="p-3 bg-red-500/10 rounded-full">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {this.props.name ? `${this.props.name} failed` : "Something went wrong"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                            {this.state.error?.message || "An unexpected error occurred."}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
