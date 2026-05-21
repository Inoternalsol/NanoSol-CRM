"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();

    useEffect(() => {

        // Listen for new contacts
        const contactsChannel = supabase
            .channel('public:contacts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'contacts' },
                (payload) => {
                    // Only notify if it was created by someone else (we assume the current user's inserts are expected)
                    // If we had a created_by field we could check: payload.new.created_by !== user.id
                    toast.success("New Contact Added", {
                        description: `${payload.new.first_name} ${payload.new.last_name || ''} was just added to the CRM.`,
                    });
                }
            )
            .subscribe();

        // Listen for new deals
        const dealsChannel = supabase
            .channel('public:deals')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deals' },
                (payload) => {
                    toast.success("New Deal Created", {
                        description: `Deal "${payload.new.name}" was just added to the pipeline.`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(contactsChannel);
            supabase.removeChannel(dealsChannel);
        };
    }, [supabase]);

    return <>{children}</>;
}
