import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { decrypt } from '@/lib/crypto';

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
        const { organization_id } = await request.json();

        // Fetch active accounts for this org and user (or org-wide)
        const { data: accounts, error: accountsError } = await supabase
            .from('smtp_configs')
            .select('*')
            .eq('organization_id', organization_id)
            .eq('is_active', true);

        if (accountsError || !accounts) return NextResponse.json({ error: 'No active accounts found' }, { status: 404 });

        const results = [];

        for (const account of accounts) {
            // Skip if no IMAP config
            if (!account.imap_host || !account.imap_user || !account.imap_pass_encrypted) continue;

            try {
                const password = decrypt(account.imap_pass_encrypted);
                const client = new ImapFlow({
                    host: account.imap_host,
                    port: account.imap_port || 993,
                    secure: true,
                    auth: {
                        user: account.imap_user,
                        pass: password
                    },
                    logger: false
                });

                await client.connect();

                // Define folders to sync
                // specific mapping can be improved later by listing folders
                const foldersToSync = [
                    { remote: 'INBOX', local: 'inbox' },
                    { remote: 'Sent', local: 'sent' }, // Standard
                    { remote: 'Sent Items', local: 'sent' }, // Outlook
                    { remote: '[Gmail]/Sent Mail', local: 'sent' } // Gmail
                ];

                // Get list of actual folders to verify existence
                const actualFolders = await client.list();

                for (const folderMapping of foldersToSync) {
                    // Check if folder exists
                    const folderExists = actualFolders.some(f => f.path === folderMapping.remote);
                    if (!folderExists && folderMapping.remote !== 'INBOX') continue; // Always try INBOX

                    try {
                        const lock = await client.getMailboxLock(folderMapping.remote);
                        try {
                            // Determine search criteria (fetch since last sync or last 50)
                            const searchCriteria = account.last_sync_at
                                ? { since: new Date(account.last_sync_at) }
                                : { seq: '1:*' }; // Fetch all if not sync (limited by slice below)

                            // Adjust search for efficiency - fetching UIDs
                            let uids = await client.search(searchCriteria) || [];

                            // If no last sync, just get the last 50
                            if (!account.last_sync_at) {
                                uids = uids.slice(-50);
                            }

                            for (const uid of uids) {
                                const message = await client.fetchOne(uid.toString(), { source: true });
                                if (!message || !message.source) continue;

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const parsed: any = await simpleParser(message.source);

                                // Upsert into Supabase
                                await supabase.from('emails').upsert({
                                    account_id: account.id,
                                    organization_id: account.organization_id,
                                    message_id: parsed.messageId || `${account.id}-${uid}`,
                                    uid: uid,
                                    from_name: parsed.from?.value[0]?.name || '',
                                    from_addr: parsed.from?.value[0]?.address || '',
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    to_addr: parsed.to ? (Array.isArray(parsed.to) ? (parsed.to[0] as any).value[0].address : (parsed.to as any).value[0].address) : '',
                                    subject: parsed.subject,
                                    body_html: parsed.html || '',
                                    body_text: parsed.text || '',
                                    folder: folderMapping.local,
                                    received_at: parsed.date?.toISOString() || new Date().toISOString()
                                }, { onConflict: 'account_id, message_id' });
                            }
                        } finally {
                            lock.release();
                        }
                    } catch (folderErr) {
                        console.warn(`Failed to sync folder ${folderMapping.remote} for ${account.name}:`, folderErr);
                    }
                }

                // Update last_sync_at
                await supabase.from('smtp_configs')
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq('id', account.id);

                results.push({ account: account.name, status: 'synced' });

                await client.logout();
            } catch (err: unknown) {
                console.error(`Sync failed for account ${account.name}:`, err);
                results.push({ account: account.name, error: err instanceof Error ? err.message : "Unknown error" });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: unknown) {
        console.error('Global sync failure:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
