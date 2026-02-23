import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

import { OutlookCalendarService } from '@/lib/services/outlook-calendar';
import { encrypt } from '@/lib/crypto';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026error=no_code', request.url));
    }

    try {
        const outlookService = new OutlookCalendarService();
        const tokens = await outlookService.getTokens(code);

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

        if (!profile) throw new Error('Profile not found');

        const { error } = await supabase
            .from('user_integrations')
            .upsert({
                user_id: user.id,
                organization_id: profile.organization_id,
                provider: 'outlook',
                access_token_encrypted: encrypt(tokens.access_token),
                refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
                expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
                metadata: { scope: tokens.scope }
            }, { onConflict: 'user_id,provider' });

        if (error) throw error;

        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026success=outlook', request.url));
    } catch (error) {
        console.error('Outlook callback error:', error);
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026error=outlook_failed', request.url));
    }
}
