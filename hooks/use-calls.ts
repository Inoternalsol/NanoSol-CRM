"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { CallLog } from "@/types";

const supabase = createClient();

// ============================================
// FETCHERS
// ============================================

async function fetchCallLogs(limit = 50): Promise<CallLog[]> {
    const { data, error } = await supabase
        .from("call_logs")
        .select(`
            *,
            contact:contacts(id, first_name, last_name, phone),
            user:profiles(id, full_name)
        `)
        .order("started_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useCallLogs(limit = 50) {
    return useSWR<CallLog[]>(`call-logs-${limit}`, () => fetchCallLogs(limit));
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCallLog() {
    return useSWRMutation(
        "call-logs-50",
        async (_, { arg }: { arg: Omit<CallLog, "id" | "created_at"> }) => {
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

export function useUpdateCallLog() {
    return useSWRMutation(
        "call-logs-50",
        async (_, { arg }: { arg: { id: string; updates: Partial<CallLog> } }) => {
            const { data, error } = await supabase
                .from("call_logs")
                .update(arg.updates)
                .eq("id", arg.id)
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
