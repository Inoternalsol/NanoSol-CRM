"use client";

import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { AutomationRule } from "@/types";

// const supabase = createClient(); // Moved inside functions for SSR safety

// ============================================
// SWR HOOKS
// ============================================

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: Omit<AutomationRule, "id" | "created_at" | "updated_at"> }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("automation_rules")
                .insert([arg])
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

export function useUpdateAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: { id: string; updates: Partial<AutomationRule> } }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("automation_rules")
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

export function useDeleteAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: string }) => {
            const supabase = createClient();
            const { error } = await supabase
                .from("automation_rules")
                .delete()
                .eq("id", arg);
            if (error) throw error;
        }
    );
}

export function useToggleAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: { id: string; is_active: boolean } }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("automation_rules")
                .update({ is_active: arg.is_active })
                .eq("id", arg.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    );
}
