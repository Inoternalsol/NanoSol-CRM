import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Create admin client with Service Role Key
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll() {},
                },
            }
        );

        // 1. Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = getSupabaseAdmin();

        // 2. Find or create an organization
        let { data: org, error: orgError } = await admin
            .from("organizations")
            .select("id")
            .limit(1)
            .single();

        if (orgError || !org) {
            // Create a default organization if none exists
            const { data: newOrg, error: createOrgError } = await admin
                .from("organizations")
                .insert({
                    name: "Default Organization",
                    slug: "default"
                })
                .select()
                .single();
            
            if (createOrgError) throw createOrgError;
            org = newOrg;
        }

        // 3. Create or update profile
        const { data: profile, error: profileError } = await admin
            .from("profiles")
            .upsert({
                user_id: user.id,
                organization_id: org.id,
                email: user.email!,
                full_name: user.user_metadata.full_name || "Admin User",
                role: "admin"
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // 4. Update user metadata as well for consistency
        await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                organization_id: org.id,
                role: "admin"
            }
        });

        return NextResponse.json({
            success: true,
            message: "User setup completed successfully",
            profile,
            organization: org
        });

    } catch (e: unknown) {
        console.error("Setup User Error:", e);
        return NextResponse.json({ error: e instanceof Error ? e.message : "Internal Error" }, { status: 500 });
    }
}
