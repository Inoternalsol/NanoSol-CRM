"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import type { Contact, ContactStatus } from "@/types";

const supabase = createClient();

// ============================================
// TYPES
// ============================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// DEFAULT STATUSES
// ============================================

const DEFAULT_STATUSES: Omit<ContactStatus, "id" | "organization_id" | "created_at">[] = [
    { name: "new", label: "New", color: "gray", order: 1 },
    { name: "contacted", label: "Contacted", color: "blue", order: 2 },
    { name: "qualified", label: "Qualified", color: "green", order: 3 },
    { name: "unqualified", label: "Unqualified", color: "red", order: 4 },
    { name: "customer", label: "Customer", color: "purple", order: 5 },
];

// ============================================
// FETCHERS
// ============================================

async function fetchContacts(): Promise<Contact[]> {
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchContactsPaginated(params: PaginationParams): Promise<PaginatedResult<Contact>> {
    const { page = 1, limit = 50, search, status } = params;
    const offset = (page - 1) * limit;

    let query = supabase
        .from("contacts")
        .select("*", { count: "exact" });

    // Apply search filter
    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
        query = query.eq("status", status);
    }

    // Apply pagination
    query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;

    return {
        data: data || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

async function fetchContact(id: string): Promise<Contact | null> {
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchContactByPhone(phone: string): Promise<Contact | null> {
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function fetchContactStatuses(): Promise<ContactStatus[]> {
    const { data, error } = await supabase
        .from("contact_statuses")
        .select("*")
        .order("order", { ascending: true });

    if (error) {
        console.warn("Could not fetch custom statuses, using defaults:", error.message);
        return DEFAULT_STATUSES.map((s, i) => ({
            ...s,
            id: `default-${i}`,
            organization_id: "default",
            created_at: new Date().toISOString()
        })) as ContactStatus[];
    }

    return data || [];
}

async function fetchContactCount(profileId?: string, isAdmin?: boolean): Promise<number> {
    let query = supabase.from("contacts").select("*", { count: "exact", head: true });
    if (!isAdmin && profileId) {
        query = query.eq("owner_id", profileId);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
}

// ============================================
// SWR HOOKS
// ============================================

/**
 * Fetch all contacts (legacy, no pagination)
 */
export function useContacts() {
    const swr = useSWR<Contact[]>("contacts", fetchContacts, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    });

    const realtimeKey = useMemo(() => (key: unknown) =>
        typeof key === "string" && (key === "contacts" || key.startsWith("contact-") || key.startsWith("contacts-paginated")),
        []);

    useRealtime("contacts", realtimeKey);

    return swr;
}

/**
 * Fetch contacts with pagination and search
 */
export function useContactsPaginated(params: PaginationParams = {}) {
    const key = `contacts-paginated-${JSON.stringify(params)}`;
    return useSWR<PaginatedResult<Contact>>(
        key,
        () => fetchContactsPaginated(params),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );
}

export function useContact(id: string | null) {
    return useSWR<Contact | null>(
        id ? `contact-${id}` : null,
        () => (id ? fetchContact(id) : null),
        { revalidateOnFocus: false }
    );
}

export function useContactByPhone(phone: string | null) {
    return useSWR<Contact | null>(
        phone ? `contact-phone-${phone}` : null,
        () => (phone ? fetchContactByPhone(phone) : null),
        { revalidateOnFocus: false }
    );
}

export function useContactStatuses() {
    const swr = useSWR<ContactStatus[]>("contact-statuses", fetchContactStatuses, {
        revalidateOnFocus: false,
    });

    useRealtime("contact_statuses", "contact-statuses");

    return swr;
}

export function useContactCount(profileId?: string, isAdmin?: boolean) {
    return useSWR<number>(
        profileId ? `contact-count-${profileId}-${isAdmin}` : null,
        () => fetchContactCount(profileId, isAdmin),
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: Omit<Contact, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("contacts")
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

export function useUpdateContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: { id: string; updates: Partial<Contact> } }) => {
            const { data, error } = await supabase
                .from("contacts")
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

export function useDeleteContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase.from("contacts").delete().eq("id", arg);
            if (error) throw error;
        }
    );
}

export function useBulkCreateContacts() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: Omit<Contact, "id" | "created_at" | "updated_at">[] }) => {
            const { data, error } = await supabase
                .from("contacts")
                .insert(arg)
                .select();
            if (error) throw error;
            return data;
        },
        {
            revalidate: true,
        }
    );
}

export function useCreateContactStatus() {
    return useSWRMutation(
        "contact-statuses",
        async (_, { arg }: { arg: Omit<ContactStatus, "id" | "created_at"> }) => {
            const { data, error } = await supabase
                .from("contact_statuses")
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

export function useUpdateContactStatus() {
    return useSWRMutation(
        "contact-statuses",
        async (_, { arg }: { arg: { id: string; updates: Partial<ContactStatus> } }) => {
            const { data, error } = await supabase
                .from("contact_statuses")
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

export function useDeleteContactStatus() {
    return useSWRMutation(
        "contact-statuses",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase
                .from("contact_statuses")
                .delete()
                .eq("id", arg);
            if (error) throw error;
        }
    );
}
