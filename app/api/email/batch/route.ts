import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { emailIds, action, destination } = body;

        if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
            return NextResponse.json({ error: 'Invalid email IDs' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'Action required' }, { status: 400 });
        }

        let error;

        if (action === 'delete') {
            // Permanent delete
            const { error: deleteError } = await supabase
                .from('emails')
                .delete()
                .in('id', emailIds);
            error = deleteError;
        } else if (action === 'move') {
            if (!destination) return NextResponse.json({ error: 'Destination folder required' }, { status: 400 });

            const { error: updateError } = await supabase
                .from('emails')
                .update({ folder: destination })
                .in('id', emailIds);
            error = updateError;
        } else if (action === 'mark_read') {
            const { error: updateError } = await supabase
                .from('emails')
                .update({ is_read: true })
                .in('id', emailIds);
            error = updateError;
        } else if (action === 'mark_unread') {
            const { error: updateError } = await supabase
                .from('emails')
                .update({ is_read: false })
                .in('id', emailIds);
            error = updateError;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error performing batch action:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
