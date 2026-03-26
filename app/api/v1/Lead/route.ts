import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { evaluateTriggers } from "@/lib/automations/engine";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * POST /api/v1/Lead
 * Creates a new lead (contact) from external platform
 */
export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get("X-Api-Key");
        const orgId = await validateApiKey(apiKey);

        if (!orgId) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        const body = await request.json();
        
        // Map fields from EspoCRM style / Generic API style
        const firstName = body.firstName || body.first_name;
        const lastName = body.lastName || body.last_name || "";
        const email = body.emailAddress || body.email;
        const phone = body.phoneNumber || body.phone || "";

        if (!firstName || !email) {
            return NextResponse.json({ error: "Missing required fields: firstName and emailAddress (or email) are required" }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const status = body.status || "new";
        
        const contactData = {
            organization_id: orgId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            status: status,
            source: "API Integration",
            tags: ["External API"],
        };

        const { data: contact, error: insertError } = await supabase
            .from("contacts")
            .insert(contactData)
            .select()
            .single();

        if (insertError) {
            console.error("API Lead Insert Error:", insertError);
            return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
        }

        // Trigger Automations
        try {
            // Trigger both 'lead_created' (Specific legacy) and 'contact_created' (Standard)
            await evaluateTriggers("lead_created", orgId, {
                contactId: contact.id,
                ...body
            });
            
            await evaluateTriggers("contact_created", orgId, {
                contactId: contact.id,
                ...body
            });
        } catch (autoError) {
            console.error("Automation Trigger Error:", autoError);
        }

        return NextResponse.json({ 
            success: true, 
            id: contact.id,
            message: "Lead created successfully" 
        }, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/v1/Lead Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * GET /api/v1/Lead
 * Pulls leads based on date filters (EspoCRM style)
 */
export async function GET(request: Request) {
    try {
        const apiKey = request.headers.get("X-Api-Key");
        const orgId = await validateApiKey(apiKey);

        if (!orgId) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const supabase = createClient(supabaseUrl, supabaseKey);

        let query = supabase
            .from("contacts")
            .select("id, first_name, last_name, email, phone, status, created_at")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });

        // Parse EspoCRM-style "where" filters
        // Example: where[0][type]=after&where[0][field]=createdAt&where[0][value]=2023-12-5T00:00:00
        
        let i = 0;
        const filtersFound: { field: string; type: string; value: string }[] = [];
        
        // We use a safe loop to find all where[i] patterns
        while (searchParams.has(`where[${i}][field]`)) {
            const field = searchParams.get(`where[${i}][field]`);
            const type = searchParams.get(`where[${i}][type]`);
            const value = searchParams.get(`where[${i}][value]`);
            
            if (field && type && value) {
                filtersFound.push({ field, type, value });
            }
            i++;
            if (i > 20) break; // Safety break
        }

        for (const filter of filtersFound) {
            const { field, type, value } = filter;
            
            // Map EspoCRM fields to DB fields
            let dbField = field;
            if (field === "createdAt") dbField = "created_at";
            if (field === "firstName") dbField = "first_name";
            if (field === "lastName") dbField = "last_name";
            if (field === "emailAddress") dbField = "email";
            if (field === "phoneNumber") dbField = "phone";

            if (type === "after") {
                query = query.gte(dbField, value);
            } else if (type === "before") {
                query = query.lte(dbField, value);
            } else if (type === "equals") {
                query = query.eq(dbField, value);
            } else if (type === "contains") {
                query = query.ilike(dbField, `%${value}%`);
            }
        }

        const { data: contacts, error: fetchError } = await query;

        if (fetchError) {
            console.error("GET /api/v1/Lead Fetch Error:", fetchError);
            return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
        }

        // Map fields back to Espo style
        const espoContacts = (contacts || []).map(c => ({
            id: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            emailAddress: c.email,
            phoneNumber: c.phone,
            status: c.status,
            createdAt: c.created_at
        }));

        return NextResponse.json({
            total: espoContacts.length,
            list: espoContacts
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/v1/Lead Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
