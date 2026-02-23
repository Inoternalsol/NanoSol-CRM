import { createClient } from '@/lib/supabase/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar';
import { encrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026error=no_code', request.url));
    }

    try {
        const googleService = new GoogleCalendarService();
        const tokens = await googleService.getTokens(code);

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
                provider: 'google',
                access_token_encrypted: encrypt(tokens.access_token!),
                refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
                expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                metadata: { scope: tokens.scope }
            }, { onConflict: 'user_id,provider' });

        if (error) throw error;

        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026success=google', request.url));
    } catch (error) {
        console.error('Google callback error:', error);
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations\u0026error=google_failed', request.url));
    }
}
