"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { AutomationRule } from "@/types";

const supabase = createClient();

// ============================================
// FETCHERS
// ============================================

async function fetchAutomationRules(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useAutomationRules() {
    return useSWR<AutomationRule[]>("automation-rules", fetchAutomationRules, {
        revalidateOnFocus: false,
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: Omit<AutomationRule, "id" | "created_at" | "updated_at"> }) => {
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
