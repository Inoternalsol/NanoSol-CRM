import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import type { Workflow, WorkflowRun, Contact, SMTPConfig } from '@/types';
import { injectTracking } from '@/lib/email-tracking';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

interface TransporterWithMeta extends nodemailer.Transporter {
    accountInfo?: SMTPConfig;
}

const transporters = new Map<string, TransporterWithMeta>();

async function getTransporter(smtpId: string): Promise<TransporterWithMeta | null> {
    let transporter = transporters.get(smtpId);
    if (!transporter) {
        const { data: account, error: accError } = await supabaseAdmin
            .from('smtp_configs')
            .select('*')
            .eq('id', smtpId)
            .single();

        if (accError || !account || !account.smtp_pass_encrypted) return null;

        const password = decrypt(account.smtp_pass_encrypted);
        const t = nodemailer.createTransport({
            host: account.smtp_host,
            port: account.smtp_port,
            secure: account.smtp_port === 465,
            auth: { user: account.smtp_user, pass: password },
            tls: { rejectUnauthorized: false },
            pool: true,
        });

        transporter = t as TransporterWithMeta;
        transporter.accountInfo = account;
        transporters.set(smtpId, transporter);
    }
    return transporter;
}

export async function POST(req: Request) {
    // Secret key check (optional but recommended for cron)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch runs due for processing
        const { data: runs, error: runsError } = await supabaseAdmin
            .from('workflow_runs')
            .select(`
                *,
                workflow:workflows(*),
                contact:contacts(*)
            `)
            .in('status', ['running', 'waiting'])
            .or(`next_execution_at.lte.${new Date().toISOString()},next_execution_at.is.null`)
            .limit(20);

        if (runsError) throw runsError;
        if (!runs || runs.length === 0) {
            return NextResponse.json({ success: true, message: 'No runs to process' });
        }

        const results = [];

        for (const run of runs) {
            try {
                const result = await processRun(run);
                results.push(result);
            } catch (err) {
                console.error(`Error processing run ${run.id}:`, err);
                results.push({ id: run.id, status: 'error', message: String(err) });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });
    } catch (error: any) {
        console.error('Workflow processing failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processRun(run: any) {
    const workflow = run.workflow as Workflow;
    const contact = run.contact as Contact;
    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];

    let currentNodeId = run.current_node_id;
    let nextNodeId: string | null = null;
    let runStatus = 'running';
    let nextExecutionAt = new Date().toISOString();

    // If starting, find trigger
    if (!currentNodeId) {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) throw new Error('No trigger node found');
        currentNodeId = triggerNode.id;
    }

    // Find current node data
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) throw new Error(`Node ${currentNodeId} not found`);

    // --- NODE EXECUTION LOGIC ---

    if (currentNode.type === 'trigger') {
        // Pass through triggers
        const edge = edges.find(e => e.source === currentNodeId);
        nextNodeId = edge ? edge.target : null;
    }
    else if (currentNode.type === 'email' || (currentNode.type === 'action' && currentNode.data.actionType === 'email')) {
        const templateId = currentNode.data.templateId;
        if (templateId) {
            await executeEmailAction(templateId, contact, workflow.organization_id, run.id);
        }
        // Move to next
        const edge = edges.find(e => e.source === currentNodeId);
        nextNodeId = edge ? edge.target : null;
    }
    else if (currentNode.type === 'delay') {
        const duration = parseInt(currentNode.data.duration || '1');
        const unit = currentNode.data.unit || 'days';

        const nextDate = new Date();
        if (unit === 'minutes') nextDate.setMinutes(nextDate.getMinutes() + duration);
        else if (unit === 'hours') nextDate.setHours(nextDate.getHours() + duration);
        else nextDate.setDate(nextDate.getDate() + duration);

        // We "pause" here. 
        // When we resume, we move to the NEXT node.
        // So we update current_node_id to the NEXT one and set delay?
        // OR we stay on delay node and the engine knows that if current is delay and we are resuming, we move forward.

        const edge = edges.find(e => e.source === currentNodeId);
        nextNodeId = edge ? edge.target : null;

        if (nextNodeId) {
            // Schedule next execution
            await supabaseAdmin.from('workflow_runs').update({
                current_node_id: nextNodeId,
                status: 'waiting',
                next_execution_at: nextDate.toISOString(),
                last_executed_at: new Date().toISOString()
            }).eq('id', run.id);
            return { id: run.id, status: 'waiting', nextNodeId };
        }
    }
    else if (currentNode.type === 'condition') {
        // Simple condition: just picks 'true' path for now or first path if unlabeled
        // In real app, evaluate contact data
        const trueEdge = edges.find(e => e.source === currentNodeId && e.sourceHandle === 'true');
        const falseEdge = edges.find(e => e.source === currentNodeId && e.sourceHandle === 'false');

        // Default to true path for mock logic or first available
        const edge = trueEdge || edges.find(e => e.source === currentNodeId);
        nextNodeId = edge ? edge.target : null;
    }

    // Update state and move to next node recursively if it's an immediate transition?
    // Better to do one node per "tick" or follow path until a delay is hit.

    if (nextNodeId) {
        await supabaseAdmin.from('workflow_runs').update({
            current_node_id: nextNodeId,
            status: 'running',
            next_execution_at: new Date().toISOString(),
            last_executed_at: new Date().toISOString()
        }).eq('id', run.id);

        // Proactively process next node (max 3 jumps per request to avoid timeouts)
        // For simplicity now, just wait for next tick or one recurse
        return { id: run.id, status: 'running', nextNodeId };
    } else {
        // End of workflow
        await supabaseAdmin.from('workflow_runs').update({
            status: 'completed',
            next_execution_at: null,
            last_executed_at: new Date().toISOString()
        }).eq('id', run.id);
        return { id: run.id, status: 'completed' };
    }
}

async function executeEmailAction(templateId: string, contact: Contact, organizationId: string, runId: string) {
    // 1. Fetch Template
    const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();
    if (!template) return;

    // 2. Find any active SMTP config for this org
    const { data: account } = await supabaseAdmin
        .from('smtp_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
    if (!account) return;

    const transporter = await getTransporter(account.id);
    if (!transporter) return;

    // 3. Prepare Body
    let body = template.body_html || template.body_text || '';
    body = body.replace(/{{first_name}}/g, contact.first_name || '');
    body = body.replace(/{{last_name}}/g, contact.last_name || '');
    body = body.replace(/{{email}}/g, contact.email || '');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 4. Create Email Record
    const { data: emailRecord } = await supabaseAdmin
        .from('emails')
        .insert({
            account_id: account.id,
            organization_id: organizationId,
            from_addr: account.email_addr,
            to_addr: contact.email,
            subject: template.subject,
            body_html: body,
            folder: 'sent',
            is_read: true,
            received_at: new Date().toISOString()
        })
        .select()
        .single();

    if (emailRecord) {
        const trackedBody = injectTracking(body, emailRecord.id, baseUrl);

        await supabaseAdmin.from('emails').update({ body_html: trackedBody }).eq('id', emailRecord.id);

        await transporter.sendMail({
            from: `"${account.name || account.smtp_user}" <${account.email_addr || account.smtp_user}>`,
            to: contact.email,
            subject: template.subject,
            html: trackedBody,
        });
    }
}
