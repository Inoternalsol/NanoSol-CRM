import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

// Admin Client for Public API (Bypasses RLS)
const supabaseUrl = "https://xqsewdcggvujkmddtltd.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Schema for header validation
const HEADERS_SCHEMA = z.object({
    "x-form-id": z.string().uuid(),
});

// Helper to validate origin/cors (placeholder for now)
// Helper to validate origin/cors (placeholder for now)
// function validateOrigin(request: Request) {
//    const origin = request.headers.get("origin") || "";
//    // In future, check DB config for allowed_origins
//    return true;
// }

export async function POST(request: Request) {
    try {
        // const supabase = createClient(); // REMOVED standard client

        // 1. Validate Headers
        const headers = Object.fromEntries(request.headers.entries());
        const headerValidation = HEADERS_SCHEMA.safeParse(headers);

        if (!headerValidation.success) {
            return NextResponse.json(
                { error: "Missing or invalid X-Form-ID header" },
                { status: 400 }
            );
        }

        const formId = headerValidation.data["x-form-id"];

        // 2. Fetch Form Configuration
        const { data: form, error: formError } = await supabase
            .from("web_forms")
            .select("*")
            .eq("id", formId)
            .eq("status", "active")
            .single();

        if (formError || !form) {
            return NextResponse.json(
                { error: "Invalid form ID or form is inactive" },
                { status: 404 }
            );
        }

        // 3. Rate Limiting (Placeholder for Implementation Plan)
        // Check key/IP rate limits here

        // 4. Parse Body
        let body: Record<string, any> = {};
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            body = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
        }

        // 5. Spam Check (Honeypot)
        // Check if 'website_url_check' (hidden field) is filled?
        // if (body._honeypot) return NextResponse.json({ success: true }); // Silent fail

        // 6. Map Fields
        // Config: { "form_field": "db_field" }
        const fieldMapping = form.config as Record<string, string>;
        const contactData: Record<string, any> = {
            organization_id: form.organization_id,
            // status: "New", // Not in schema
            // source: form.source || "Web Form", // Not in schema -> moved to custom_fields
            tags: ["Web Lead", form.name],
            custom_fields: {
                source: form.source || "Web Form",
                status: "New"
            }
        };

        // Auto-map common fields if no mapping provided, or use mapping
        const basicFields = ["first_name", "last_name", "email", "phone", "company", "job_title"];

        // Explicit mapping
        Object.entries(fieldMapping).forEach(([formField, dbField]) => {
            if (body[formField]) {
                contactData[dbField] = body[formField];
            }
        });

        // Fallback: If no mapping, try direct match
        if (Object.keys(fieldMapping).length === 0) {
            basicFields.forEach(field => {
                if (body[field]) contactData[field] = body[field];
            });
            // Try snake_case conversion?
        }

        // Capture unmapped fields to notes/custom_fields?
        // contactData.custom_fields = ...

        // 7. Insert Contact
        // Ensure no invalid columns sneak in from field mapping
        delete contactData.source;
        delete contactData.status;

        const { data: contact, error: insertError } = await supabase
            .from("contacts")
            .insert(contactData)
            .select()
            .single();

        if (insertError) {
            console.error("Web Lead Insert Error:", insertError);
            return NextResponse.json(
                { error: `Failed to process lead: ${insertError.message}` },
                { status: 500 }
            );
        }

        // 8. Create Notification for Admins
        // We can use a trigger, or do it here.
        // Fetch admins
        const { data: admins } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("organization_id", form.organization_id)
            .in("role", ["admin", "manager"]);

        if (admins) {
            const notifs = admins.map(a => ({
                organization_id: form.organization_id,
                user_id: a.user_id,
                title: "New Web Lead",
                message: `${contact.first_name} ${contact.last_name || ""} from ${form.name}`,
                type: "lead",
                link: `/dashboard/contacts?id=${contact.id}`
            }));
            await supabase.from("notifications").insert(notifs);
        }

        // 9. Response / Redirect
        if (form.redirect_url) {
            return NextResponse.redirect(new URL(form.redirect_url), 302);
        }

        return NextResponse.json({ success: true, id: contact.id }, { status: 200 });

    } catch (error: any) {
        console.error("Web Lead API Error:", error);
        return NextResponse.json(
            {
                error: (error?.message || "Internal Server Error"),
                stack: error?.stack,
                details: JSON.stringify(error, Object.getOwnPropertyNames(error))
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*", // Or specific domains
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Form-ID",
        },
    });
}
