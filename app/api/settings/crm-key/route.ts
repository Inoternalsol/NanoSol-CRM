import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { apiKey } = await req.json();
        if (!apiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use Admin Client to bypass RLS for the sensitive api_keys table
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        const { data: profileData, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("organization_id, role")
            .eq("user_id", user.id)
            .single();

        if (profileError || !profileData) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Only admins/managers can update CRM keys
        if (!["admin", "manager"].includes(profileData.role)) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const { error: upsertError } = await supabaseAdmin
            .from("api_keys")
            .upsert({ 
                organization_id: profileData.organization_id, 
                crm_api_key: apiKey,
                active_provider: 'openai'
            }, { onConflict: 'organization_id' });

        if (upsertError) throw upsertError;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error updating CRM key:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
