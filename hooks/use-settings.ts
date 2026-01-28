"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Organization, SIPProfile, SMTPConfig, APIKeys } from "@/types";

const supabase = createClient();

// ============================================
// FETCHERS
// ============================================

async function fetchProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchSipProfile(userId: string): Promise<SIPProfile | null> {
    const { data, error } = await supabase
        .from("sip_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function fetchSmtpConfig(orgId: string): Promise<SMTPConfig | null> {
    const { data, error } = await supabase
        .from("smtp_configs")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function fetchApiKeys(orgId: string): Promise<APIKeys | null> {
    const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ============================================
// SWR HOOKS
// ============================================

export function useActiveProfile() {
    return useSWR<Profile | null>("active-profile", async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();
            if (error) return null;
            return data;
        } catch {
            return null;
        }
    }, {
        revalidateOnFocus: false,
    });
}

export function useProfiles() {
    return useSWR<Profile[]>("profiles", fetchProfiles, {
        revalidateOnFocus: false,
    });
}

export function useOrganization(id: string | null) {
    return useSWR<Organization | null>(id ? `org-${id}` : null, () =>
        id ? fetchOrganization(id) : null
    );
}

export function useSipProfile(userId: string | null) {
    return useSWR<SIPProfile | null>(userId ? `sip-${userId}` : null, () =>
        userId ? fetchSipProfile(userId) : null
    );
}

export function useSmtpConfig(orgId: string | null) {
    return useSWR<SMTPConfig | null>(orgId ? `smtp-${orgId}` : null, () =>
        orgId ? fetchSmtpConfig(orgId) : null
    );
}

export function useApiKeys(orgId: string | null) {
    return useSWR<APIKeys | null>(orgId ? `api-keys-${orgId}` : null, () =>
        orgId ? fetchApiKeys(orgId) : null
    );
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useUpdateProfile() {
    return useSWRMutation(
        "profiles",
        async (_, { arg }: { arg: { id: string; updates: Partial<Profile> } }) => {
            const { data, error } = await supabase
                .from("profiles")
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

export function useDeleteProfile() {
    return useSWRMutation(
        "profiles",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase.from("profiles").delete().eq("id", arg);
            if (error) throw error;
        }
    );
}

export function useCreateProfile() {
    return useSWRMutation(
        "profiles",
        async (_, { arg }: { arg: Omit<Profile, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("profiles")
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

export function useUpdateOrganization() {
    return useSWRMutation(
        "organizations",
        async (_, { arg }: { arg: { id: string; updates: Partial<Organization> } }) => {
            const { data, error } = await supabase
                .from("organizations")
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

export function useUpdateSipProfile() {
    return useSWRMutation(
        "sip-profiles",
        async (_, { arg }: { arg: { userId: string; orgId: string; updates: Partial<SIPProfile> } }) => {
            // Try update first
            const { data: existing } = await supabase
                .from("sip_profiles")
                .select("id")
                .eq("user_id", arg.userId)
                .maybeSingle();

            if (existing) {
                const { data, error } = await supabase
                    .from("sip_profiles")
                    .update(arg.updates)
                    .eq("user_id", arg.userId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from("sip_profiles")
                    .insert([{ ...arg.updates, user_id: arg.userId, organization_id: arg.orgId }])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateSmtpConfig() {
    return useSWRMutation(
        "smtp-configs",
        async (_, { arg }: { arg: { orgId: string; updates: Partial<SMTPConfig> } }) => {
            const { data: existing } = await supabase
                .from("smtp_configs")
                .select("id")
                .eq("organization_id", arg.orgId)
                .maybeSingle();

            if (existing) {
                const { data, error } = await supabase
                    .from("smtp_configs")
                    .update(arg.updates)
                    .eq("organization_id", arg.orgId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from("smtp_configs")
                    .insert([{ ...arg.updates, organization_id: arg.orgId }])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateApiKeys() {
    return useSWRMutation(
        "api-keys",
        async (_, { arg }: { arg: { orgId: string; updates: Partial<APIKeys> } }) => {
            const { data: existing } = await supabase
                .from("api_keys")
                .select("id")
                .eq("organization_id", arg.orgId)
                .maybeSingle();

            if (existing) {
                const { data, error } = await supabase
                    .from("api_keys")
                    .update(arg.updates)
                    .eq("organization_id", arg.orgId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from("api_keys")
                    .insert([{ ...arg.updates, organization_id: arg.orgId }])
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        {
            revalidate: true,
        }
    );
}
