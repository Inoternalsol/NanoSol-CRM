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
        const organization_id = session.user.user_metadata.organization_id;

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
