import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const {
            id,
            name,
            from_name, // Added from_name
            email_addr,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            imap_host,
            imap_port,
            imap_user,
            imap_pass,
            is_org_wide,
            organization_id
        } = body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
            name,
            from_name,
            email_addr,
            smtp_host,
            smtp_port,
            smtp_user,
            imap_host,
            imap_port,
            imap_user,
            is_org_wide,
            organization_id,
            user_id: is_org_wide ? null : (await supabase.from('profiles').select('id').eq('user_id', user.id).single()).data?.id,
            is_active: true
        };

        if (smtp_pass) {
            updates.smtp_pass_encrypted = encrypt(smtp_pass);
        }

        if (imap_pass) {
            updates.imap_pass_encrypted = encrypt(imap_pass);
        }

        let result;
        if (id) {
            result = await supabase.from('smtp_configs').update(updates).eq('id', id).select().single();
        } else {
            result = await supabase.from('smtp_configs').insert([updates]).select().single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, data: result.data });
    } catch (error: unknown) {
        console.error('Failed to save email account:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
