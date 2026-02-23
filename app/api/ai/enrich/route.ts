import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
import { getActiveAIProvider, generateEmbedding, getAICompletion } from "@/lib/ai-services";

export async function POST(request: NextRequest) {
    try {
        const { contactId, dealId } = await request.json();
        const supabase = await createClient();

        if (!contactId && !dealId) {
            return NextResponse.json({ error: "Missing contactId or dealId" }, { status: 400 });
        }

        // Fetch user context for API keys
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const keys = await getActiveAIProvider(profile.organization_id);
        if (!keys) return NextResponse.json({ error: "AI provider not configured" }, { status: 400 });

        if (contactId) {
            const { data: contact } = await supabase.from("contacts").select("*").eq("id", contactId).single();
            if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

            // 1. Generate Embedding
            const searchText = `${contact.first_name} ${contact.last_name} ${contact.company} ${contact.job_title} ${JSON.stringify(contact.custom_fields)}`;
            const embedding = await generateEmbedding(searchText, keys);

            // 2. Generate Enrichment (AI Tags/Insights)
            const prompt = `Review this contact and suggest 3 professional tags and a 1-sentence sales insight. 
            Contact: ${JSON.stringify(contact)}
            Return as JSON: { "tags": [], "insight": "" }`;

            const aiResponse = await getAICompletion(prompt, keys, "You are a senior sales researcher.");
            let enrichment: { tags: string[]; insight: string } = { tags: [], insight: "" };

            if (aiResponse) {
                try {
                    enrichment = JSON.parse(aiResponse.replace(/```json|```/g, ""));
                } catch {
                    console.error("Failed to parse AI response:", aiResponse);
                }
            }

            // 3. Update Contact
            const { error: updateError } = await supabase.from("contacts")
                .update({
                    embedding,
                    tags: [...new Set([...(contact.tags || []), ...enrichment.tags])],
                    custom_fields: { ...(contact.custom_fields || {}), ai_insight: enrichment.insight }
                })
                .eq("id", contactId);

            if (updateError) throw updateError;

            return NextResponse.json({ success: true, enrichment });
        }

        return NextResponse.json({ error: "Feature not yet implemented for deals" }, { status: 501 });

    } catch (error) {
        console.error("[AI Enrichment] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
