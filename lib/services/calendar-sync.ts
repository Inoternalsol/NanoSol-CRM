import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { GoogleCalendarService } from './google-calendar';
import { OutlookCalendarService } from './outlook-calendar';

export class CalendarSyncService {
    async syncUserCalendar(userId: string, provider: 'google' | 'outlook') {
        const supabase = await createClient();

        // 1. Get integration tokens
        const { data: integration, error: intError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();

        if (intError || !integration) throw new Error(`Integration for ${provider} not found`);

        const accessToken = decrypt(integration.access_token_encrypted);
        const refreshToken = integration.refresh_token_encrypted ? decrypt(integration.refresh_token_encrypted) : null;

        let events: any[] = [];

        // 2. Fetch events from provider
        if (provider === 'google') {
            const google = new GoogleCalendarService();
            events = await google.getEvents(accessToken, refreshToken!) || [];
            // Note: Google client handles refresh automatically if initialized with refresh_token
        } else {
            const outlook = new OutlookCalendarService();
            events = await outlook.getEvents(accessToken) || [];
        }

        // 3. Map and Upsert to CRM Calendar
        for (const event of events) {
            const mappedEvent = this.mapExternalEvent(event, provider, userId, integration.organization_id);

            await supabase
                .from('calendar_events')
                .upsert(mappedEvent, { onConflict: 'external_id' }); // Need to add external_id to schema if not exists
        }

        return { count: events.length };
    }

    private mapExternalEvent(event: any, provider: string, userId: string, orgId: string) {
        if (provider === 'google') {
            return {
                organization_id: orgId,
                title: event.summary || 'Google Meeting',
                description: event.description,
                start_time: event.start.dateTime || event.start.date,
                end_time: event.end.dateTime || event.end.date,
                all_day: !!event.start.date,
                created_by: userId,
                external_id: `google_${event.id}`,
                metadata: { source: 'google', etag: event.etag }
            };
        } else {
            return {
                organization_id: orgId,
                title: event.subject || 'Outlook Meeting',
                description: event.bodyPreview,
                start_time: event.start.dateTime,
                end_time: event.end.dateTime,
                all_day: event.isAllDay,
                created_by: userId,
                external_id: `outlook_${event.id}`,
                metadata: { source: 'outlook' }
            };
        }
    }
}
