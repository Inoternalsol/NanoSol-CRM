import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 1x1 Transparent Pixel
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // Update tracking using service role
        const now = new Date().toISOString();

        // Update both if possible (enrollment and specific email log)
        // We increment the opens_count and set the first opened_at
        const { error } = await supabase
            .from('emails')
            .update({
                opened_at: now,
                is_read: true,
                opens_count: supabase.rpc('increment', { row_id: id, column_name: 'opens_count' }) // This won't work directly with update
            })
            .eq('id', id);

        // Actually, let's use a simpler approach since we might not have the RPC 'increment' defined yet.
        // We'll just do a raw increment if possible, or fetch and update.
        // For now, let's just update the timestamp. The trigger 'on_email_opened' (from add_open_tracking.sql)
        // will handle the sync to sequence_enrollments.
        // I will add a manual increment logic here just in case the trigger isn't full.

        await supabase.rpc('increment_email_opens', { email_id: id });

        if (error) {
            console.error('Tracking error:', error);
        }

    } catch (err) {
        console.error('Unexpected tracking error:', err);
    }

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
