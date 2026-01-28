import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with Service Role Key (never expose client-side)
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error("Missing Supabase configuration. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local");
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, full_name, role, phone, organization_id } = await request.json();

        // Validate required fields
        if (!email || !password || !full_name || !role || !organization_id) {
            return NextResponse.json(
                { error: "Missing required fields: email, password, full_name, role, organization_id" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Step 1: Create the auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email so they can log in immediately
            user_metadata: {
                full_name,
                role,
            },
        });

        if (authError) {
            console.error("Auth user creation error:", authError);
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: "Failed to create user" },
                { status: 500 }
            );
        }

        // Step 2: Create or update the profile linked to the auth user
        // We use upsert because a database trigger might have already created a basic profile
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                user_id: authData.user.id,
                email,
                full_name,
                role,
                phone: phone || null,
                organization_id,
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (profileError) {
            console.error("Profile creation error:", profileError);
            // If profile creation fails, we should clean up the auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json(
                { error: `Profile creation failed: ${profileError.message}` },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            userId: authData.user.id,
            profileId: profileData.id,
            message: `User ${full_name} created successfully`,
        });

    } catch (error) {
        console.error("Create user API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
