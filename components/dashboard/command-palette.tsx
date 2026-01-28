"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Briefcase,
    Calendar,
    Phone,
    Settings,
    Plus,
    Search,
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useCommandPaletteStore } from "@/lib/stores";

const quickActions = [
    { name: "New Contact", icon: Plus, action: "/dashboard/contacts/new" },
    { name: "New Deal", icon: Plus, action: "/dashboard/deals/new" },
    { name: "Start Call", icon: Phone, action: "open-dialer" },
];

const navigationItems = [
    { name: "Go to Contacts", icon: Users, action: "/dashboard/contacts" },
    { name: "Go to Deals", icon: Briefcase, action: "/dashboard/deals" },
    { name: "Go to Calendar", icon: Calendar, action: "/dashboard/calendar" },
    { name: "Go to Settings", icon: Settings, action: "/dashboard/settings" },
];

export function CommandPalette() {
    const router = useRouter();
    const { isOpen, close, toggle } = useCommandPaletteStore();

    // Keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [toggle]);

    const runCommand = useCallback(
        (command: string) => {
            close();
            if (command.startsWith("/")) {
                router.push(command);
            } else if (command === "open-dialer") {
                // TODO: Open dialer via store
                console.log("Opening dialer...");
            }
        },
        [router, close]
    );

    return (
        <CommandDialog open={isOpen} onOpenChange={close}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Quick Actions">
                    {quickActions.map((item) => (
                        <CommandItem
                            key={item.name}
                            onSelect={() => runCommand(item.action)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Navigation">
                    {navigationItems.map((item) => (
                        <CommandItem
                            key={item.name}
                            onSelect={() => runCommand(item.action)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Search">
                    <CommandItem onSelect={() => runCommand("/dashboard/contacts")}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search Contacts...</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand("/dashboard/deals")}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search Deals...</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
