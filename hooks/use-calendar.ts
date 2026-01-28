"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/types";

const supabase = createClient();

// ============================================
// FETCHERS
// ============================================

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
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
    return useSWR<CalendarEvent[]>("calendar-events", fetchCalendarEvents, {
        revalidateOnFocus: false,
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCalendarEvent() {
    return useSWRMutation(
        "calendar-events",
        async (_, { arg }: { arg: Omit<CalendarEvent, "id" | "created_at" | "updated_at"> }) => {
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
