"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveProfile } from "@/hooks/use-data";

interface PresenceState {
    users: Record<string, {
        profile_id: string;
        email: string;
        full_name: string;
        avatar_url?: string;
        last_seen: string;
        current_path: string;
    }>;
}

const PresenceContext = createContext<{
    presence: PresenceState;
    onlineCount: number;
} | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const { data: profile } = useActiveProfile();
    const [presence, setPresence] = useState<PresenceState>({ users: {} });
    const supabase = createClient();

    useEffect(() => {
        if (!profile?.organization_id) return;

        const channel = supabase.channel(`org_presence:${profile.organization_id}`, {
            config: {
                presence: {
                    key: profile.id,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const formattedUsers: PresenceState["users"] = {};

                Object.keys(state).forEach((key) => {
                    const typedState = state[key] as unknown as Array<{
                        profile_id: string;
                        email: string;
                        full_name: string;
                        avatar_url?: string;
                        last_seen: string;
                        current_path: string;
                    }>;
                    if (typedState[0]) {
                        formattedUsers[key] = typedState[0];
                    }
                });

                setPresence({ users: formattedUsers });
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        profile_id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name,
                        avatar_url: profile.avatar_url,
                        last_seen: new Date().toISOString(),
                        current_path: window.location.pathname,
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [profile, supabase]);

    return (
        <PresenceContext.Provider value={{ presence, onlineCount: Object.keys(presence.users).length }}>
            {children}
        </PresenceContext.Provider>
    );
}

export const usePresence = () => {
    const context = useContext(PresenceContext);
    if (context === undefined) {
        throw new Error("usePresence must be used within a PresenceProvider");
    }
    return context;
};
