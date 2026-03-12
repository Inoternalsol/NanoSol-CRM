import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { evaluateTriggers } from "@/lib/automations/engine";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        
        // 1. Try metadata first
        let organization_id = session.user.user_metadata.organization_id;

        // 2. Fallback to profile lookup if metadata is missing (robustness fix)
        if (!organization_id) {
            console.warn("[Contacts API] organization_id missing from metadata, falling back to profile lookup");
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("user_id", session.user.id)
                .maybeSingle();
            
            organization_id = profile?.organization_id;
        }

        if (!organization_id) {
            return NextResponse.json({ error: "Could not identify organization for user. Please re-login." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("contacts")
            .insert({
                ...body,
                organization_id,
                source: "Dashboard"
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Fire Automation Engine Triggers for the newly created lead
        await evaluateTriggers('contact_created', organization_id, {
            contactId: data.id,
            source: 'manual_entry',
            formId: null
        });

        return NextResponse.json(data, { status: 201 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Invalid payload" }, { status: 400 });
    }
}
