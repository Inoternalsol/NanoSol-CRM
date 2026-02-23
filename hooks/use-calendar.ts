"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import type { CalendarEvent } from "@/types";

// const supabase = createClient(); // Moved inside functions for SSR safety

// ============================================
// FETCHERS
// ============================================

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_time", { ascending: true });
    if (error) throw error;
    return data || [];
}

// ============================================
// SWR HOOKS
// ============================================

export function useCalendarEvents() {
    const swr = useSWR<CalendarEvent[]>("calendar-events", fetchCalendarEvents, {
        revalidateOnFocus: false,
    });

    useRealtime("calendar_events", "calendar-events");

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCalendarEvent() {
    return useSWRMutation(
        "calendar-events",
        async (_, { arg }: { arg: Omit<CalendarEvent, "id" | "created_at" | "updated_at"> }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("calendar_events")
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
