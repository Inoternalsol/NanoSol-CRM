import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const { id } = await params;

    if (!url) {
        return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        const now = new Date().toISOString();

        // Update click tracking
        // We increment clicks_count and set last_clicked_at
        const { error } = await supabase
            .from('emails')
            .update({
                clicked_at: now,
                clicks_count: 1 // We'll improve this with an RPC if available
            })
            .eq('id', id);

        // Optional: RPC call for robust incrementing
        await supabase.rpc('increment_email_clicks', { email_id: id });

        if (error) {
            console.error('Click tracking error:', error);
        }

    } catch (err) {
        console.error('Unexpected click tracking error:', err);
    }

    // Always redirect, even on error, to maintain user experience
    return NextResponse.redirect(new URL(url), 302);
}
