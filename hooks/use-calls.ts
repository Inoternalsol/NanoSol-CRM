"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import type { CallLog } from "@/types";

// const supabase = createClient(); // Moved inside functions for SSR safety

// ============================================
// FETCHERS
// ============================================

async function fetchCallLogs(limit = 50, contactId?: string): Promise<CallLog[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    let query = supabase
        .from("call_logs")
        .select(`
            *,
            contact:contacts(id, first_name, last_name, phone),
            user:profiles(id, full_name)
        `)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(limit);

    if (contactId) {
        query = query.eq("contact_id", contactId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useCallLogs(limit = 50, contactId?: string) {
    const swr = useSWR<CallLog[]>(
        contactId ? `call-logs-${contactId}-${limit}` : `call-logs-${limit}`,
        () => fetchCallLogs(limit, contactId)
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("call-logs-"), []);
    useRealtime("call_logs", realtimeKey);

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCallLog() {
    return useSWRMutation(
        "call-logs-50",
        async (_, { arg }: { arg: Omit<CallLog, "id" | "created_at"> }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("call_logs")
                .insert([{
                    ...arg,
                    started_at: arg.started_at || new Date().toISOString(),
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        {
            revalidate: true,
        }
    );
}

