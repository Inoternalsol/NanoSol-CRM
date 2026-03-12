import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Create admin client
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

        // 2. Fetch all profiles for this user
        const { data: profiles, error: fetchError } = await admin
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (fetchError) throw fetchError;

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ error: "No profile found to sync" }, { status: 404 });
        }

        const primaryProfile = profiles[0];
        const orgId = primaryProfile.organization_id;

        // 3. Deduplicate (delete other profiles for same user)
        if (profiles.length > 1) {
            const idsToDelete = profiles.slice(1).map(p => p.id);
            const { error: deleteError } = await admin
                .from("profiles")
                .delete()
                .in("id", idsToDelete);
            
            if (deleteError) {
                console.error("Deduplication error:", deleteError);
            }
        }

        // 4. Sync Auth Metadata
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                organization_id: orgId,
                role: primaryProfile.role
            }
        });

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            sync_details: {
                user_id: user.id,
                org_id: orgId,
                profiles_cleaned: profiles.length - 1,
                primary_profile_id: primaryProfile.id
            },
            message: "Profile deduplicated and auth metadata synced. Please re-login if changes don't reflect immediately."
        });

    } catch (e: any) {
        console.error("Sync Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
