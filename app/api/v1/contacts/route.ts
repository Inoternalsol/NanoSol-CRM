import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateApiKey, ApiContext } from "@/lib/api-middleware";
import { z } from "zod";

export async function GET(request: Request) {
    const validation = await validateApiKey(request);
    if (validation instanceof NextResponse) return validation;
    const { organization_id } = validation as ApiContext;

    const supabase = await createClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .eq("organization_id", organization_id)
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        data,
        meta: {
            page,
            limit,
            total: count
        }
    });
}

// Schema for Contact Creation
const CONTACT_SCHEMA = z.object({
    first_name: z.string().min(1),
    last_name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    company: z.string().optional(),
});

export async function POST(request: Request) {
    const validation = await validateApiKey(request);
    if (validation instanceof NextResponse) return validation;
    const { organization_id } = validation as ApiContext;

    try {
        const json = await request.json();
        const body = CONTACT_SCHEMA.parse(json);
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("contacts")
            .insert({
                ...body,
                organization_id,
                source: "API"
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ data }, { status: 201 });

    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: e.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
}
