"use client";

import { useUIStore } from "@/lib/stores";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { CallWidget } from "@/components/dashboard/call-widget";
import { cn } from "@/lib/utils";

import { SipProvider } from "@/components/providers/sip-provider";
import { CopilotProvider } from "@/components/copilot/copilot-provider";
import { CopilotWidget } from "@/components/copilot/copilot-widget";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { sidebarCollapsed } = useUIStore();

    return (
        <SipProvider>
            <CopilotProvider>
                <div className="min-h-screen bg-background">
                    <Sidebar />
                    <MobileSidebar />
                    <div
                        className={cn(
                            "transition-all duration-200",
                            sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
                        )}
                    >
                        <Topbar />
                        <main className="p-4 md:p-6">{children}</main>
                    </div>
                    <CommandPalette />
                    <CallWidget />
                    <CopilotWidget />
                </div>
            </CopilotProvider>
        </SipProvider>
    );
}
