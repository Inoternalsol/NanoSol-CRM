import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get organization_id for the user
        // Assuming user is in an organization context or we fetch it from their profile
        // For simplicity, we'll try to get it from the request query or infer it
        // A better way is if the client passes it, or we fetch it from a 'profiles' or 'members' table
        // But let's check how other routes do it. The sync route expects it in the body.
        // Here we might need to fetch it or rely on RLS if policies are set up correctly.

        // Actually, RLS policies on 'emails' table use `get_user_org_id()` function.
        // So we just need to select from 'emails'.

        const { data, count, error } = await supabase
            .from('emails')
            .select('*', { count: 'exact' })
            .eq('folder', folder)
            .order('received_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                folder
            }
        });

    } catch (error: any) {
        console.error('Error fetching emails:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
