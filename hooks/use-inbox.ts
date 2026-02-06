import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "./use-realtime";
import { useMemo } from "react";

export interface Email {
    id: string;
    organization_id: string;
    account_id: string;
    from_addr: string;
    to_addr: string;
    subject: string;
    body_html: string;
    body_text?: string;
    folder: string;
    is_read: boolean;
    received_at: string;
    created_at: string;
    has_attachment?: boolean; // inferred or mock for now
    is_starred?: boolean; // inferred or mock for now
}

export function useEmails(folder: string = "inbox", accountId?: string | "all") {
    const supabase = createClient();
    const { data: session } = useSWR("session", async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    });

    const key = session ? ["emails", folder, accountId] : null;

    const swr = useSWR(key, async () => {
        let query = supabase
            .from("emails")
            .select("*")
            .eq("folder", folder)
            .order("received_at", { ascending: false });

        if (accountId && accountId !== "all") {
            query = query.eq("account_id", accountId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Email[];
    });

    // Real-time subscription
    const realtimeKey = useMemo(() => (k: unknown) => {
        // Refresh if the key is "emails" and matches our folder
        // For simplicity, we can refresh on any email change for now, 
        // or refine to check if the changed email belongs to this folder.
        return typeof k === "string" && k === "emails";
    }, []);

    useRealtime("emails", realtimeKey);

    return swr;
}
