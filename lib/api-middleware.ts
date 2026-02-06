import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export interface ApiContext {
    organization_id: string;
    scopes: string[];
}

export async function validateApiKey(request: Request): Promise<ApiContext | NextResponse> {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
        return NextResponse.json(
            { error: "Missing X-API-Key header" },
            { status: 401 }
        );
    }

    // Hash the provided key to compare with stored hash
    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    const supabase = await createClient();

    const { data: keyRecord, error } = await supabase
        .from("organization_api_keys")
        .select("*")
        .eq("key_hash", keyHash)
        .eq("is_active", true)
        .single();

    if (error || !keyRecord) {
        return NextResponse.json(
            { error: "Invalid or inactive API Key" },
            { status: 401 }
        );
    }

    // Update last_used_at (async, fire & forget to not block)
    // In a real app we might use a queue or ensure this doesn't slow down the request significantly
    // For now we await it to be safe or use supabase.rpc if available
    await supabase
        .from("organization_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", keyRecord.id);

    return {
        organization_id: keyRecord.organization_id,
        scopes: keyRecord.scopes || []
    };
}
