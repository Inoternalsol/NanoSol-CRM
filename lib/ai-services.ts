import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export interface AIProviderKeys {
    openai_key_encrypted?: string;
    gemini_key_encrypted?: string;
    active_provider: "openai" | "gemini" | "qwen" | "kimi";
}

export async function getActiveAIProvider(organizationId: string): Promise<AIProviderKeys | null> {
    const supabase = await createClient();
    const { data: apiKeys } = await supabase
        .from("api_keys")
        .select("*")
        .eq("organization_id", organizationId)
        .single();

    return apiKeys;
}

export async function generateEmbedding(text: string, keys: AIProviderKeys): Promise<number[] | null> {
    if (keys.active_provider === "openai" && keys.openai_key_encrypted) {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${keys.openai_key_encrypted}`,
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: text,
            }),
        });

        const data = await response.json();
        return data.data?.[0]?.embedding || null;
    }

    // Fallback or other providers can be added here
    return null;
}

export async function getAICompletion(prompt: string, keys: AIProviderKeys, systemPrompt?: string): Promise<string | null> {
    const provider = keys.active_provider;

    try {
        if (provider === "openai" && keys.openai_key_encrypted) {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${keys.openai_key_encrypted}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt || "You are a helpful CRM assistant." },
                        { role: "user", content: prompt }
                    ],
                }),
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        }

        if (provider === "gemini" && keys.gemini_key_encrypted) {
            const genAI = new GoogleGenerativeAI(keys.gemini_key_encrypted);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent((systemPrompt ? systemPrompt + "\n\n" : "") + prompt);
            return result.response.text();
        }
    } catch (error) {
        console.error(`[AI Service] Error with ${provider}:`, error);
    }

    return null;
}
