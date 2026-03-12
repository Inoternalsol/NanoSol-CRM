import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .single();

        const { data: orgs, error: orgsError } = await supabase
            .from("organizations")
            .select("*");

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            session: {
                user_id: session.user.id,
                email: session.user.email,
                metadata: session.user.user_metadata,
            },
            profile: {
                data: profile,
                error: profileError?.message
            },
            organizations: {
                count: orgs?.length || 0,
                data: orgs,
                error: orgsError?.message
            }
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
    }
}
