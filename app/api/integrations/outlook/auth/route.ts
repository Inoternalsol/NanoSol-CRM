import { NextResponse } from 'next/server';
import { OutlookCalendarService } from '@/lib/services/outlook-calendar';

export async function GET() {
    try {
        const service = new OutlookCalendarService();
        const url = service.getAuthUrl();
        return NextResponse.redirect(url);
    } catch (error) {
        console.error('Outlook auth error:', error);
        return NextResponse.json({ error: 'Failed to initiate Outlook auth' }, { status: 500 });
    }
}
