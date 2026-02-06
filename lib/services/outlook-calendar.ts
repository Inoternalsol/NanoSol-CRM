import { Client } from '@microsoft/microsoft-graph-client';
import "isomorphic-fetch";

export class OutlookCalendarService {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    constructor() {
        this.clientId = process.env.AZURE_CLIENT_ID!;
        this.clientSecret = process.env.AZURE_CLIENT_SECRET!;
        this.redirectUri = process.env.AZURE_REDIRECT_URI!;
    }

    getAuthUrl() {
        const scopes = ['Calendars.Read', 'User.Read', 'offline_access'];
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.clientId}\u0026response_type=code\u0026redirect_uri=${encodeURIComponent(this.redirectUri)}\u0026response_mode=query\u0026scope=${encodeURIComponent(scopes.join(' '))}\u0026state=outlook_auth`;
    }

    async getTokens(code: string) {
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get Outlook tokens: ${await response.text()}`);
        }

        return response.json();
    }

    async getEvents(accessToken: string) {
        const client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });

        const response = await client.api('/me/calendar/events')
            .select('subject,start,end,isAllDay,bodyPreview')
            .orderby('start/dateTime')
            .get();

        return response.value;
    }
}
