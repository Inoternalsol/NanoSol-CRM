import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: accounts, error } = await supabase
        .from("smtp_configs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(accounts);
}

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

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, updates, orgId: providedOrgId } = await request.json();

        // 1. Get user org and role
        const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('id, organization_id, role')
            .eq('user_id', user.id)
            .single();

        if (profError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const orgId = providedOrgId || profile.organization_id;

        // 2. Security Check: Only admins/managers can add/edit shared accounts
        if (updates.is_org_wide && profile.role !== 'admin' && profile.role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden: Only admins can manage shared accounts' }, { status: 403 });
        }

        // 3. Handle Encryption for both SMTP and IMAP
        if (updates.smtp_pass_plain) {
            updates.smtp_pass_encrypted = encrypt(updates.smtp_pass_plain);
            delete updates.smtp_pass_plain;
        }
        if (updates.imap_pass_plain) {
            updates.imap_pass_encrypted = encrypt(updates.imap_pass_plain);
            delete updates.imap_pass_plain;
        }

        // 4. Upsert Logic
        let result;
        if (id) {
            // Update
            const { data, error } = await supabase
                .from("smtp_configs")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from("smtp_configs")
                .insert([{
                    ...updates,
                    organization_id: orgId,
                    user_id: updates.is_org_wide ? null : profile.id, // Assign to user if not org-wide
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('SMTP Save Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
        .from("smtp_configs")
        .delete()
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
