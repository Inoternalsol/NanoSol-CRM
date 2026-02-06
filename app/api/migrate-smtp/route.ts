import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// One-time migration endpoint to populate smtp_config_id for sequences
export async function POST() {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // Get all sequences without smtp_config_id
        const { data: sequences, error: seqError } = await supabaseAdmin
            .from('email_sequences')
            .select('id, organization_id, name, smtp_config_id');

        if (seqError) throw seqError;

        const updates = [];
        const results = [];

        for (const seq of sequences || []) {
            // Find first active SMTP config for this org
            const { data: smtpConfig } = await supabaseAdmin
                .from('smtp_configs')
                .select('id')
                .eq('organization_id', seq.organization_id)
                .eq('is_active', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (smtpConfig && !seq.smtp_config_id) {
                updates.push({
                    id: seq.id,
                    smtp_config_id: smtpConfig.id
                });

                // Update the sequence
                const { error: updateError } = await supabaseAdmin
                    .from('email_sequences')
                    .update({ smtp_config_id: smtpConfig.id })
                    .eq('id', seq.id);

                results.push({
                    sequence_name: seq.name,
                    status: updateError ? 'error' : 'updated',
                    error: updateError?.message
                });
            } else if (seq.smtp_config_id) {
                results.push({
                    sequence_name: seq.name,
                    status: 'already_has_smtp'
                });
            } else {
                results.push({
                    sequence_name: seq.name,
                    status: 'no_smtp_config_found'
                });
            }
        }

        return NextResponse.json({
            success: true,
            updated: updates.length,
            results
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
