"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/**
 * A reusable hook to subscribe to Supabase Realtime changes for a specific table.
 * When a change occurs (INSERT, UPDATE, DELETE), it triggers an SWR mutation
 * for the provided keys.
 * 
 * @param table The table name to subscribe to
 * @param swrKeys One or more SWR keys to revalidate on change, or a filter function
 * @param filter Optional Postgres filter (e.g., "organization_id=eq.xyz")
 */
export function useRealtime(
    table: string,
    swrKeys: string | string[] | ((key: unknown) => boolean),
    filter?: string
) {
    useEffect(() => {
        const channelName = `public:${table}-changes`;
        console.log(`[Realtime] Initializing channel: ${channelName}`);
        let channel = supabase.channel(channelName);

        const triggerMutate = (payload: any) => {
            console.log(`[Realtime] Change detected in ${table}:`, payload);
            if (typeof swrKeys === "function") {
                mutate(swrKeys);
            } else {
                const keys = Array.isArray(swrKeys) ? swrKeys : [swrKeys];
                keys.forEach(key => mutate(key));
            }
        };

        if (filter) {
            channel = channel.on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: table,
                    filter: filter
                },
                (payload) => triggerMutate(payload)
            );
        } else {
            channel = channel.on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: table,
                },
                (payload) => triggerMutate(payload)
            );
        }

        channel.subscribe((status) => {
            console.log(`[Realtime] Subscription status for ${table}:`, status);
        });

        return () => {
            console.log(`[Realtime] Cleaning up channel for ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, swrKeys, filter]);
}
