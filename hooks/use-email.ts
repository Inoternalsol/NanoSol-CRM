"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { EmailTemplate, EmailSequence } from "@/types";

const supabase = createClient();

// ============================================
// FETCHERS
// ============================================

async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchEmailSequences(): Promise<EmailSequence[]> {
    const { data, error } = await supabase
        .from("email_sequences")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useEmailTemplates() {
    return useSWR<EmailTemplate[]>("email-templates", fetchEmailTemplates, {
        revalidateOnFocus: false,
    });
}

export function useEmailSequences() {
    return useSWR<EmailSequence[]>("email-sequences", fetchEmailSequences, {
        revalidateOnFocus: false,
    });
}

// ============================================
// MUTATION HOOKS - SEQUENCES
// ============================================

export function useCreateEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: Omit<EmailSequence, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("email_sequences")
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

export function useUpdateEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: { id: string; updates: Partial<EmailSequence> } }) => {
            const { data, error } = await supabase
                .from("email_sequences")
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

export function useDeleteEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase
                .from("email_sequences")
                .delete()
                .eq("id", arg);
            if (error) throw error;
        }
    );
}

// ============================================
// MUTATION HOOKS - TEMPLATES
// ============================================

export function useCreateEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: Omit<EmailTemplate, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("email_templates")
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

export function useUpdateEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: { id: string; updates: Partial<EmailTemplate> } }) => {
            const { data, error } = await supabase
                .from("email_templates")
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

export function useDeleteEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase
                .from("email_templates")
                .delete()
                .eq("id", arg);
            if (error) throw error;
        }
    );
}
