"use client";

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import { PresenceProvider } from "@/components/providers/presence-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { CallWidget } from "@/components/dashboard/call-widget";
import { CopilotWidget } from "@/components/copilot/copilot-widget";
import { SipProvider } from "@/components/providers/sip-provider";
import { CopilotProvider } from "@/components/copilot/copilot-provider";
import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { sidebarCollapsed } = useUIStore();

    return (
        <SipProvider>
            <CopilotProvider>
                <PresenceProvider>
                    <div className="min-h-screen bg-background relative overflow-hidden">
                        {/* Global Background Layer */}
                        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/5 via-background to-background pointer-events-none" />

                        <Sidebar />
                        <MobileSidebar />

                        <div
                            className={cn(
                                "transition-all duration-300 ease-in-out relative z-10",
                                sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
                            )}
                        >
                            <Topbar />

                            <main className="p-4 md:p-6 min-h-[calc(100vh-64px)]">
                                <ErrorBoundary name="Main Content">
                                    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">Loading dashboard module...</div>}>
                                        {children}
                                    </Suspense>
                                </ErrorBoundary>
                            </main>
                        </div>

                        {/* Critical Global Floating Widgets */}
                        <ErrorBoundary name="Command Palette">
                            <CommandPalette />
                        </ErrorBoundary>

                        <ErrorBoundary name="Call Center">
                            <CallWidget />
                        </ErrorBoundary>

                        <ErrorBoundary name="AI Copilot">
                            <CopilotWidget />
                        </ErrorBoundary>

                        {/* Global Navigation Progress */}
                        <ProgressBar
                            height="3px"
                            color="hsl(var(--primary))"
                            options={{ showSpinner: false }}
                            shallowRouting
                        />
                    </div>
                </PresenceProvider>
            </CopilotProvider>
        </SipProvider>
    );
}
