"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import type { Workflow } from "@/types";

// const supabase = createClient(); // Moved inside functions for SSR safety

// ============================================
// FETCHERS
// ============================================

async function fetchWorkflows(): Promise<Workflow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useWorkflows() {
    const swr = useSWR<Workflow[]>("workflows", fetchWorkflows, {
        revalidateOnFocus: false,
    });

    useRealtime("workflows", "workflows");

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: Omit<Workflow, "id" | "created_at" | "updated_at"> }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("workflows")
                .insert([arg])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    );
}

export function useUpdateWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: { id: string; updates: Partial<Workflow> } }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("workflows")
                .update(arg.updates)
                .eq("id", arg.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    );
}

export function useDeleteWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("workflows")
                .delete()
                .eq("id", arg);
            if (error) throw error;
        }
    );
}
