"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import type { Deal, Pipeline, Task, Activity } from "@/types";

const supabase = createClient();

// ============================================
// TYPES
// ============================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// FETCHERS
// ============================================

async function fetchDeals(): Promise<Deal[]> {
    const { data, error } = await supabase
        .from("deals")
        .select(`
      *,
      contact:contacts(id, first_name, last_name, email)
    `)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function fetchDealsPaginated(params: PaginationParams): Promise<PaginatedResult<Deal>> {
    const { page = 1, limit = 50, search, stage } = params;
    const offset = (page - 1) * limit;

    let query = supabase
        .from("deals")
        .select(`
            *,
            contact:contacts(id, first_name, last_name, email)
        `, { count: "exact" });

    // Apply search filter
    if (search) {
        query = query.ilike("title", `%${search}%`);
    }

    // Apply stage filter
    if (stage) {
        query = query.eq("stage", stage);
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

async function fetchDeal(id: string): Promise<Deal | null> {
    const { data, error } = await supabase
        .from("deals")
        .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone, company)
    `)
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchPipelines(): Promise<Pipeline[]> {
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("created_at");
    if (error) throw error;
    return data || [];
}

async function fetchActivities(limit = 20): Promise<Activity[]> {
    const { data, error } = await supabase
        .from("activities")
        .select(`
      *,
      created_by:profiles(id, full_name, avatar_url)
    `)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

async function fetchTasks(status?: string): Promise<Task[]> {
    let query = supabase
        .from("tasks")
        .select(`
      *,
      assigned_to:profiles(id, full_name, avatar_url),
      contact:contacts(id, first_name, last_name)
    `)
        .order("due_date", { ascending: true });

    if (status) {
        query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function fetchDealStats(profileId?: string, isAdmin?: boolean): Promise<{ activeCount: number, totalRevenue: number }> {
    let query = supabase.from("deals").select("stage, value");
    if (!isAdmin && profileId) {
        query = query.eq("owner_id", profileId);
    }
    const { data, error } = await query;
    if (error) throw error;

    const activeCount = data?.filter(d => d.stage !== "closed" && d.stage !== "lost").length || 0;
    const totalRevenue = data?.reduce((acc, deal) => acc + (deal.stage === "closed" ? deal.value : 0), 0) || 0;

    return { activeCount, totalRevenue };
}

// ============================================
// SWR HOOKS
// ============================================

/**
 * Fetch all deals (legacy, no pagination)
 */
export function useDeals() {
    const swr = useSWR<Deal[]>("deals", fetchDeals, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    });

    const realtimeKey = useMemo(() => (key: unknown) =>
        typeof key === "string" && (key === "deals" || key.startsWith("deals-paginated")),
        []);

    useRealtime("deals", realtimeKey);

    return swr;
}

/**
 * Fetch deals with pagination and search
 */
export function useDealsPaginated(params: PaginationParams = {}) {
    const key = `deals-paginated-${JSON.stringify(params)}`;
    return useSWR<PaginatedResult<Deal>>(
        key,
        () => fetchDealsPaginated(params),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );
}

export function useDeal(id: string | null) {
    return useSWR<Deal | null>(
        id ? `deal-${id}` : null,
        () => (id ? fetchDeal(id) : null),
        { revalidateOnFocus: false }
    );
}

export function usePipelines() {
    const swr = useSWR<Pipeline[]>("pipelines", fetchPipelines, {
        revalidateOnFocus: false,
    });

    useRealtime("pipelines", "pipelines");

    return swr;
}

export function useActivities(limit = 20) {
    const swr = useSWR<Activity[]>(
        `activities-${limit}`,
        () => fetchActivities(limit),
        { revalidateOnFocus: false }
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("activities-"), []);
    useRealtime("activities", realtimeKey);

    return swr;
}

export function useTasks(status?: string) {
    const swr = useSWR<Task[]>(
        `tasks-${status || "all"}`,
        () => fetchTasks(status),
        { revalidateOnFocus: false }
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("tasks-"), []);
    useRealtime("tasks", realtimeKey);

    return swr;
}

export function useDealStats(profileId?: string, isAdmin?: boolean) {
    return useSWR<{ activeCount: number, totalRevenue: number }>(
        profileId ? `deal-stats-${profileId}-${isAdmin}` : null,
        () => fetchDealStats(profileId, isAdmin),
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: Omit<Deal, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("deals")
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

export function useUpdateDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: { id: string; updates: Partial<Deal> } }) => {
            const { data, error } = await supabase
                .from("deals")
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

export function useDeleteDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: string }) => {
            const { error } = await supabase.from("deals").delete().eq("id", arg);
            if (error) throw error;
        }
    );
}

export function useCreateTask() {
    return useSWRMutation(
        "tasks-all",
        async (_, { arg }: { arg: Omit<Task, "id" | "created_at" | "updated_at"> }) => {
            const { data, error } = await supabase
                .from("tasks")
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

export function useCompleteTask() {
    return useSWRMutation(
        "tasks-all",
        async (_, { arg }: { arg: string }) => {
            const { data, error } = await supabase
                .from("tasks")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", arg)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    );
}

export function useCreateActivity() {
    return useSWRMutation(
        "activities-20",
        async (_, { arg }: { arg: Omit<Activity, "id" | "created_at"> }) => {
            const { data, error } = await supabase
                .from("activities")
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
