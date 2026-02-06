import { createClient } from '@/lib/supabase/server';
import { CalendarSyncService } from '@/lib/services/calendar-sync';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { provider } = await request.json();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const syncService = new CalendarSyncService();
        const result = await syncService.syncUserCalendar(user.id, provider);

        return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
