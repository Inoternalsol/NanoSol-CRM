"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Organization, SIPProfile, SMTPConfig, APIKeys, UserIntegration } from "@/types";

const supabase = createClient();

// ============================================
// SWR HOOKS
// ============================================

export function useActiveProfile() {
    return useSWR<Profile | null>("active-profile", async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (error) {
            console.error("Error fetching active profile:", error);
            return null;
        }
        return data;
    });
}

export function useProfiles() {
    return useSWR<Profile[]>("profiles", async () => {
        const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    });
}

export function useOrganization(id: string | null) {
    return useSWR<Organization | null>(id ? `org-${id}` : null, async () => {
        if (!id) return null;
        const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
        if (error) throw error;
        return data;
    });
}

export function useSipProfile(userId: string | null) {
    return useSWR<SIPProfile | null>(userId ? `sip-${userId}` : null, async () => {
        if (!userId) return null;
        const { data, error } = await supabase.from("sip_profiles").select("*").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        return data;
    });
}

export function useSmtpConfig(orgId: string | null) {
    return useSWR<SMTPConfig | null>(orgId ? `smtp-${orgId}` : null, async () => {
        if (!orgId) return null;
        const { data, error } = await supabase.from("smtp_configs").select("*").eq("organization_id", orgId).maybeSingle();
        if (error) throw error;
        return data;
    });
}

export function useApiKeys(orgId: string | null) {
    return useSWR<APIKeys | null>(orgId ? `api-keys-${orgId}` : null, async () => {
        if (!orgId) return null;
        const { data, error } = await supabase.from("api_keys").select("*").eq("organization_id", orgId).maybeSingle();
        if (error) throw error;
        return data;
    });
}

export function useIntegrations(userId: string | null) {
    return useSWR<UserIntegration[] | null>(userId ? `integrations-${userId}` : null, async () => {
        if (!userId) return [];
        const { data, error } = await supabase.from("user_integrations").select("*").eq("user_id", userId);
        if (error) throw error;
        return data || [];
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useUpdateProfile() {
    return useSWRMutation("profiles", async (_, { arg }: { arg: { id: string; updates: Partial<Profile> } }) => {
        const { data, error } = await supabase.from("profiles").update(arg.updates).eq("id", arg.id).select().single();
        if (error) throw error;
        return data;
    });
}

export function useDeleteProfile() {
    return useSWRMutation("profiles", async (_, { arg }: { arg: string }) => {
        const { error } = await supabase.from("profiles").delete().eq("id", arg);
        if (error) throw error;
    });
}

export function useCreateProfile() {
    return useSWRMutation("profiles", async (_, { arg }: { arg: Omit<Profile, "id" | "created_at" | "updated_at"> }) => {
        const { data, error } = await supabase.from("profiles").insert([arg]).select().single();
        if (error) throw error;
        return data;
    });
}

export function useUpdateOrganization() {
    return useSWRMutation("organizations", async (_, { arg }: { arg: { id: string; updates: Partial<Organization> } }) => {
        const { data, error } = await supabase.from("organizations").update(arg.updates).eq("id", arg.id).select().single();
        if (error) throw error;
        return data;
    });
}

export function useUpdateSipProfile() {
    return useSWRMutation("sip-profiles", async (_, { arg }: { arg: { userId: string; orgId: string; updates: Partial<SIPProfile> } }) => {
        const { data: existing } = await supabase.from("sip_profiles").select("id").eq("user_id", arg.userId).maybeSingle();
        if (existing) {
            const { data, error } = await supabase.from("sip_profiles").update(arg.updates).eq("user_id", arg.userId).select().single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase.from("sip_profiles").insert([{ ...arg.updates, user_id: arg.userId, organization_id: arg.orgId }]).select().single();
            if (error) throw error;
            return data;
        }
    });
}

export function useUpdateSmtpConfig() {
    return useSWRMutation("smtp-configs", async (_, { arg }: { arg: { orgId: string; updates: Partial<SMTPConfig> } }) => {
        const res = await fetch("/api/settings/smtp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(arg),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update SMTP settings");
        return data;
    });
}

export function useUpdateApiKeys() {
    return useSWRMutation("api-keys", async (_, { arg }: { arg: { orgId: string; updates: Partial<APIKeys> } }) => {
        const { data: existing } = await supabase.from("api_keys").select("id").eq("organization_id", arg.orgId).maybeSingle();
        if (existing) {
            const { data, error } = await supabase.from("api_keys").update(arg.updates).eq("organization_id", arg.orgId).select().single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase.from("api_keys").insert([{ ...arg.updates, organization_id: arg.orgId }]).select().single();
            if (error) throw error;
            return data;
        }
    });
}

export function useSyncCalendar() {
    return useSWRMutation("integrations", async (_, { arg }: { arg: { provider: string } }) => {
        const res = await fetch("/api/integrations/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(arg),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sync calendar");
        return data;
    });
}

// ============================================
// SIP MULTI-ACCOUNT HOOKS
// ============================================

export function useSipAccounts(userId: string | null) {
    return useSWR<SIPProfile[]>(userId ? `sip-accounts-${userId}` : null, async () => {
        if (!userId) return [];
        const { data, error } = await supabase
            .from("sip_profiles")
            .select("*")
            .eq("user_id", userId)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
    });
}

export function useSaveSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: {
        arg: {
            id?: string;
            userId: string;
            orgId: string;
            data: Partial<SIPProfile>;
        }
    }) => {
        const accountData = {
            ...arg.data,
            user_id: arg.userId,
            organization_id: arg.orgId,
        };

        if (arg.id) {
            // Update existing
            const { data, error } = await supabase
                .from("sip_profiles")
                .update(accountData)
                .eq("id", arg.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            // Create new
            const { data, error } = await supabase
                .from("sip_profiles")
                .insert([accountData])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    });
}

export function useDeleteSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: { arg: string }) => {
        const { error } = await supabase
            .from("sip_profiles")
            .delete()
            .eq("id", arg);
        if (error) throw error;
    });
}

export function useSetDefaultSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: { arg: { id: string; userId: string } }) => {
        // The database trigger will handle unsetting other defaults
        const { data, error } = await supabase
            .from("sip_profiles")
            .update({ is_default: true })
            .eq("id", arg.id)
            .eq("user_id", arg.userId)
            .select()
            .single();
        if (error) throw error;
        return data;
    });
}

