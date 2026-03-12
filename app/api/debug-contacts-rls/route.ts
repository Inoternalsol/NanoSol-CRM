import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "No session" }, { status: 401 });
        }

        const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("*");

        const { data: orgs, error: orgsError } = await supabase
            .from("organizations")
            .select("*");

        // Try calling the SQL function directly if we have permission
        const { data: functionOrgId, error: functionError } = await supabase
            .rpc('get_user_org_id');

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            session_metadata: session.user.user_metadata,
            profiles_found: profiles?.length || 0,
            rpc_org_id: functionOrgId,
            profile_error: profileError?.message,
            org_error: orgsError?.message,
            orgs_count: orgs?.length || 0,
            first_org_id: orgs?.[0]?.id,
            profiles_details: profiles,
            rpc_error: functionError?.message
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Internal Error" }, { status: 500 });
    }
}
