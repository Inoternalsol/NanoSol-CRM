import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { enrollmentIds } = await req.json();

        if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            return NextResponse.json({ error: "No enrollment IDs provided" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // 1. Get User Session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get User Organization
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile/Organization not found" }, { status: 404 });
        }

        // 3. Delete enrollments (RLS will also handle this if enabled, but we add an explicit check)
        // We use the authenticated client to ensure RLS is respected
        const { data, error: deleteError } = await supabase
            .from("sequence_enrollments")
            .delete()
            .in("id", enrollmentIds)
            .eq("organization_id", profile.organization_id)
            .select();

        if (deleteError) {
            console.error("[API] Delete error:", deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: enrollmentIds.length,
            deletedCount: data?.length || 0,
            deletedIds: data?.map(d => d.id) || []
        });
    } catch (error: unknown) {
        console.error("[API] Unexpected error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
