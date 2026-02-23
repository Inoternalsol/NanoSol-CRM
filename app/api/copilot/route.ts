import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are an AI copilot for a CRM (Customer Relationship Management) system called NanoSol CRM. 
You help sales and customer success teams with:
- Drafting professional emails to contacts
- Summarizing contact information and deal history
- Suggesting follow-up actions
- Analyzing pipeline and providing insights
- Writing meeting notes and summaries

Be concise, professional, and helpful. When asked to draft content, provide ready-to-use text.
If you don't have enough context, ask clarifying questions.`;

interface APIKeysRow {
    openai_key_encrypted?: string;
    gemini_key_encrypted?: string;
    qwen_key_encrypted?: string;
    kimi_key_encrypted?: string;
    active_provider: "openai" | "gemini" | "qwen" | "kimi";
}

async function getApiKeys(): Promise<{ keys: APIKeysRow | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { keys: null, error: null }; // Not authenticated, will use demo
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .single();

        if (!profile) {
            return { keys: null, error: null };
        }

        const { data: apiKeys } = await supabase
            .from("api_keys")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .single();

        return { keys: apiKeys, error: null };
    } catch (err) {
        console.error("[Copilot] Error:", err);
        return { keys: null, error: null };
    }
}

async function callOpenAI(apiKey: string, message: string, context?: Record<string, unknown>): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: context ? `Context: ${JSON.stringify(context)}\n\n${message}` : message }
            ],
            max_tokens: 1000,
        }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `OpenAI error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || "No response generated";
}

async function callGemini(apiKey: string, message: string, context?: Record<string, unknown>): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let fullPrompt = SYSTEM_PROMPT + "\n\n";
    if (context) fullPrompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    fullPrompt += `User: ${message}`;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();
}

async function callQwen(apiKey: string, message: string, context?: Record<string, unknown>): Promise<string> {
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "qwen-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: context ? `Context: ${JSON.stringify(context)}\n\n${message}` : message }
            ],
        }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `QWEN error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || "No response generated";
}

async function callKimi(apiKey: string, message: string, context?: Record<string, unknown>): Promise<string> {
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "moonshot-v1-8k",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: context ? `Context: ${JSON.stringify(context)}\n\n${message}` : message }
            ],
        }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `KIMI error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || "No response generated";
}

export async function POST(request: NextRequest) {
    try {
        const { message, context } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        const { keys: apiKeys } = await getApiKeys();

        if (!apiKeys) {
            return NextResponse.json({ response: getDemoResponse(message) });
        }

        const provider = apiKeys.active_provider;
        let responseText: string | null = null;
        let apiError: string | null = null;

        try {
            switch (provider) {
                case "openai":
                    if (!apiKeys.openai_key_encrypted) {
                        return NextResponse.json({ response: "⚠️ OpenAI API key not configured. Go to Settings → Integrations → API Keys." });
                    }
                    responseText = await callOpenAI(apiKeys.openai_key_encrypted, message, context);
                    break;
                case "gemini":
                    if (!apiKeys.gemini_key_encrypted) {
                        return NextResponse.json({ response: "⚠️ Gemini API key not configured. Go to Settings → Integrations → API Keys." });
                    }
                    responseText = await callGemini(apiKeys.gemini_key_encrypted, message, context);
                    break;
                case "qwen":
                    if (!apiKeys.qwen_key_encrypted) {
                        return NextResponse.json({ response: "⚠️ QWEN API key not configured. Go to Settings → Integrations → API Keys." });
                    }
                    responseText = await callQwen(apiKeys.qwen_key_encrypted, message, context);
                    break;
                case "kimi":
                    if (!apiKeys.kimi_key_encrypted) {
                        return NextResponse.json({ response: "⚠️ KIMI API key not configured. Go to Settings → Integrations → API Keys." });
                    }
                    responseText = await callKimi(apiKeys.kimi_key_encrypted, message, context);
                    break;
                default:
                    return NextResponse.json({ response: getDemoResponse(message) });
            }
        } catch (err) {
            apiError = err instanceof Error ? err.message : "Unknown API error";
            console.error(`[Copilot] ${provider} API error:`, apiError);
        }

        if (responseText) {
            return NextResponse.json({ response: responseText });
        }

        // If API call failed, return error message in response (not as HTTP error)
        return NextResponse.json({
            response: `⚠️ **AI Provider Error (${provider})**\n\n${apiError}\n\nPlease check your API key in Settings → Integrations → API Keys.`
        });

    } catch (error) {
        console.error("Copilot API error:", error);
        // Return demo response instead of 500 error
        return NextResponse.json({ response: getDemoResponse("help") });
    }
}

function getDemoResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("email") || lowerMessage.includes("draft")) {
        return `Here's a draft email for you:

Subject: Following Up on Our Recent Conversation

Hi [Name],

I hope this message finds you well. I wanted to follow up on our recent discussion and see if you have any questions about our proposal.

I'd be happy to schedule a call to discuss further or provide any additional information you might need.

Looking forward to hearing from you.

Best regards,
[Your Name]

---
💡 *Configure your API keys in Settings → Integrations for AI-powered responses.*`;
    }

    if (lowerMessage.includes("summarize") || lowerMessage.includes("summary")) {
        return `📊 **Contact Summary**

• Last interaction: Recent activity recorded
• Engagement level: Active
• Next suggested action: Schedule follow-up call

---
💡 *Configure your API keys in Settings → Integrations for AI-powered responses.*`;
    }

    return `I'm your AI Copilot! I can help you with:

• 📧 **Draft emails** - "Help me write a follow-up email"
• 📋 **Summarize contacts** - "Summarize this contact's history"
• ✅ **Suggest actions** - "What should I do next with this lead?"
• 📊 **Pipeline insights** - "Analyze my current deals"

---
💡 *Configure your API keys in Settings → Integrations for AI-powered responses.*`;
}
