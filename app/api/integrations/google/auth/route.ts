import { NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar';

export async function GET() {
    try {
        const service = new GoogleCalendarService();
        const url = service.getAuthUrl();
        return NextResponse.redirect(url);
    } catch (error) {
        console.error('Google auth error:', error);
        return NextResponse.json({ error: 'Failed to initiate Google auth' }, { status: 500 });
    }
}
