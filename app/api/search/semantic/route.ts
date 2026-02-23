import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
import { getActiveAIProvider, generateEmbedding } from "@/lib/ai-services";

export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json();
        const supabase = await createClient();

        if (!query) {
            return NextResponse.json({ error: "Missing query" }, { status: 400 });
        }

        // Fetch user context for API keys
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const keys = await getActiveAIProvider(profile.organization_id);
        if (!keys) return NextResponse.json({ error: "AI provider not configured" }, { status: 400 });

        // 1. Generate Embedding for the query
        const queryEmbedding = await generateEmbedding(query, keys);
        if (!queryEmbedding) return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });

        // 2. Search using RPC functions
        const { data: contacts, error: contactError } = await supabase.rpc("match_contacts", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5,
            p_organization_id: profile.organization_id
        });

        if (contactError) throw contactError;

        const { data: deals, error: dealError } = await supabase.rpc("match_deals", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5,
            p_organization_id: profile.organization_id
        });

        if (dealError) throw dealError;

        return NextResponse.json({
            results: {
                contacts: contacts || [],
                deals: deals || []
            }
        });

    } catch (error) {
        console.error("[Semantic Search] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
