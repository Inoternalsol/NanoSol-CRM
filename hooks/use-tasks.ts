import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { useMemo } from "react";
import type { Task } from "@/types";

export function useTasks(filters?: {
    status?: string | "all";
    priority?: string | "all";
    assigned_to?: string | "all";
}) {
    const supabase = createClient();

    const { data: session } = useSWR("session", async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    });

    const key = session ? ["tasks", filters] : null;

    const swr = useSWR(key, async () => {
        let query = supabase
            .from("tasks")
            .select(`
                *,
                assigned_to:profiles!assigned_to(id, full_name, avatar_url),
                contact:contacts(id, first_name, last_name),
                deal:deals(id, name)
            `)
            .order("due_date", { ascending: true });

        if (filters?.status && filters.status !== "all") {
            query = query.eq("status", filters.status);
        }

        if (filters?.priority && filters.priority !== "all") {
            query = query.eq("priority", filters.priority);
        }

        if (filters?.assigned_to && filters.assigned_to !== "all") {
            query = query.eq("assigned_to", filters.assigned_to);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform the data to match our interface
        return data.map(item => ({
            ...item,
            // Ensure nested objects are handled correctly if Supabase returns array or null
            assigned_to: Array.isArray(item.assigned_to) ? item.assigned_to[0] : item.assigned_to,
            contact: Array.isArray(item.contact) ? item.contact[0] : item.contact,
            deal: Array.isArray(item.deal) ? item.deal[0] : item.deal,
        })) as Task[];
    });

    const realtimeKey = useMemo(() => (k: unknown) => {
        return typeof k === "string" && k === "tasks";
    }, []);

    useRealtime("tasks", realtimeKey);

    return swr;
}

export function useCreateTask() {
    const supabase = createClient();

    return {
        trigger: async (newTask: Partial<Task>) => {
            const { data, error } = await supabase
                .from("tasks")
                .insert(newTask)
                .select()
                .single();

            if (error) throw error;
            mutate(key => Array.isArray(key) && key[0] === "tasks");
            return data;
        }
    };
}

export function useUpdateTask() {
    const supabase = createClient();

    return {
        trigger: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
            const { data, error } = await supabase
                .from("tasks")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            mutate(key => Array.isArray(key) && key[0] === "tasks");
            return data;
        }
    };
}

export function useDeleteTask() {
    const supabase = createClient();

    return {
        trigger: async (id: string) => {
            const { error } = await supabase
                .from("tasks")
                .delete()
                .eq("id", id);

            if (error) throw error;
            mutate(key => Array.isArray(key) && key[0] === "tasks");
        }
    };
}
