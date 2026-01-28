"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/lib/stores";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Calendar,
    Phone,
    Mail,
    Settings,
    Zap,
    Building2,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveProfile } from "@/hooks/use-data";
import { useEffect } from "react";

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
}

const navigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Contacts", href: "/dashboard/contacts", icon: Users },
    { name: "Deals", href: "/dashboard/deals", icon: Briefcase },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { name: "Calls", href: "/dashboard/calls", icon: Phone },
    { name: "Email", href: "/dashboard/email", icon: Mail },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Team", href: "/dashboard/team", icon: Users, roles: ["admin", "manager"] },
    { name: "Automations", href: "/dashboard/automations", icon: Zap, roles: ["admin"] },
];

const bottomNavigation: NavItem[] = [
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function MobileSidebar() {
    const pathname = usePathname();
    const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
    const { data: profile } = useActiveProfile();

    // Close sidebar when route changes
    useEffect(() => {
        setMobileSidebarOpen(false);
    }, [pathname, setMobileSidebarOpen]);

    const filteredNavigation = navigation.filter(item => {
        if (!item.roles) return true;
        return profile && item.roles.includes(profile.role);
    });

    return (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[240px]">
                <SheetHeader className="h-16 border-b px-4 flex-row items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <SheetTitle className="text-lg font-semibold">NanoSol</SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 px-3 py-4 h-[calc(100vh-128px)]">
                    <nav className="flex flex-col gap-1">
                        {filteredNavigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "h-5 w-5 shrink-0",
                                            isActive ? "text-primary" : ""
                                        )}
                                    />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 border-t border-border px-3 py-4 bg-card">
                    {bottomNavigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
}
