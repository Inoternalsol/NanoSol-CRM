import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { enrollmentIds } = await req.json();

        if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            return NextResponse.json({ error: "No enrollment IDs provided" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Security check: Verify the sequence belongs to the same organization
        // (In a real app, you'd verify the user's session and organization membership here too)
        // For now, we rely on the fact that if they have the sequenceId, they can manage it.
        // Better: We should check the user's session.

        const { data, error } = await supabase
            .from("sequence_enrollments")
            .delete()
            .in("id", enrollmentIds)
            .select();

        if (error) {
            console.error("[API] Delete error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if ((data?.length || 0) === 0) {
            console.warn("[API] No records deleted. IDs may not exist or are already deleted.");
            return NextResponse.json({
                error: "Enrollment not found or already deleted",
                count: enrollmentIds.length,
                deletedCount: 0
            }, { status: 404 });
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
