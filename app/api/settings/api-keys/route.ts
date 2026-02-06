import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";

const CREATE_KEY_SCHEMA = z.object({
    label: z.string().min(1),
    scopes: z.array(z.string()).default(["contacts:read", "contacts:write"]),
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's org role
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id, role")
            .eq("user_id", user.id)
            .single();

        if (!profile || !["admin", "manager"].includes(profile.role)) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const json = await request.json();
        const { label, scopes } = CREATE_KEY_SCHEMA.parse(json);

        // Generate Key
        // Format: nk_live_<24_chars_random_hex>
        const randomPart = randomBytes(24).toString("hex");
        const apiKey = `nk_live_${randomPart}`;
        const keyHash = createHash("sha256").update(apiKey).digest("hex");
        const keyPrefix = apiKey.substring(0, 15); // "nk_live_" + 7 chars

        const { data, error } = await supabase
            .from("organization_api_keys")
            .insert({
                organization_id: profile.organization_id,
                label,
                scopes,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // RETURN THE RAW KEY ONLY ONCE
        return NextResponse.json({
            apiKey,
            id: data.id,
            label: data.label,
            key_prefix: data.key_prefix
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // RLS Policies should handle the permission check if we use supabase client correctly
        // But api route runs as service role or cookie based? createClient() uses cookies.
        // So RLS applies. Admin/Manager policy on DELETE/UPDATE needed.
        // My migration policy was:
        // CREATE POLICY "Admins can manage api keys" ON public.organization_api_keys FOR ALL ...

        const { error } = await supabase
            .from("organization_api_keys")
            .delete()
            .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
