import { createClient } from '@supabase/supabase-js';
import { Workflow, Contact } from "@/types";
import { Node as RFNode, Edge } from "reactflow";
import { sendEmail } from "@/lib/email-service";

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export interface WorkflowRun {
    id: string;
    organization_id: string;
    workflow_id: string;
    contact_id: string;
    status: 'running' | 'completed' | 'failed' | 'waiting';
    current_node_id: string | null;
    metadata: Record<string, unknown>;
    workflow: Workflow;
    contact: Contact;
}

export async function processWorkflowRun(runId: string, depth = 0) {
    if (depth > 5) return; // Prevent infinite loops

    // 1. Fetch Run and Workflow
    const { data: run, error: runError } = await getSupabaseAdmin()
        .from('workflow_runs')
        .select(`
            *,
            workflow:workflows(*),
            contact:contacts(*)
        `)
        .eq('id', runId)
        .single();

    if (runError || !run) {
        await logExecution(null, null, 'error', 'Workflow run not found: ' + runId);
        return;
    }

    const typedRun = run as unknown as WorkflowRun;

    if (typedRun.status === 'completed' || typedRun.status === 'failed') return;

    const workflow = typedRun.workflow as Workflow;
    const nodes = workflow.nodes as RFNode[];
    const edges = workflow.edges as Edge[];

    // 2. Determine Next Node
    let nextNodeId: string | null = null;

    if (!typedRun.current_node_id) {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            await logExecution(typedRun, null, 'error', 'No trigger node found');
            await markRunStatus(runId, 'failed');
            return;
        }
        await logExecution(typedRun, triggerNode.id, 'info', `Workflow started via ${triggerNode.data.triggerType}`);
        const edge = edges.find(e => e.source === triggerNode.id);
        nextNodeId = edge ? edge.target : null;
    } else {
        const edge = edges.find(e => e.source === typedRun.current_node_id);
        nextNodeId = edge ? edge.target : null;
    }

    if (!nextNodeId) {
        await logExecution(run, run.current_node_id, 'info', 'Workflow completed');
        await markRunStatus(runId, 'completed');
        return;
    }

    const currentNode = nodes.find(n => n.id === nextNodeId);
    if (!currentNode) {
        await logExecution(run, nextNodeId, 'error', `Node ${nextNodeId} not found`);
        await markRunStatus(runId, 'failed');
        return;
    }

    // 3. Execute Node Logic
    try {
        await logExecution(run, nextNodeId, 'info', `Executing node type: ${currentNode.type}`);

        switch (currentNode.type) {
            case 'email':
                await executeEmailAction(run, currentNode);
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;

            case 'delay':
                const delayUntil = calculateDelay(currentNode.data);
                await logExecution(run, nextNodeId, 'info', `Delaying execution until ${delayUntil.toLocaleString()}`);
                await markRunStatus(runId, 'waiting', {
                    current_node_id: nextNodeId,
                    next_execution_at: delayUntil.toISOString()
                });
                break;

            case 'condition':
                const branch = await evaluateCondition(run, currentNode);
                await logExecution(run, nextNodeId, 'info', `Condition evaluated to: ${branch}`);
                const branchEdge = edges.find(e => e.source === nextNodeId && e.sourceHandle === branch);
                if (branchEdge) {
                    await advanceWorkflow(runId, branchEdge.target, depth + 1);
                } else {
                    await logExecution(run, nextNodeId, 'info', `No path found for branch ${branch}, completing workflow`);
                    await markRunStatus(runId, 'completed');
                }
                break;

            case 'action':
                await executeGeneralAction(run, currentNode);
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;

            default:
                await advanceWorkflow(runId, nextNodeId, depth + 1);
                break;
        }
    } catch (err: any) {
        await logExecution(run, nextNodeId, 'error', `Execution failed: ${err.message}`);
        await markRunStatus(runId, 'failed', { metadata: { ...run.metadata, error: err.message } });
    }
}

async function logExecution(run: WorkflowRun | null, nodeId: string | null, level: string, message: string) {
    await getSupabaseAdmin().from('workflow_logs').insert({
        organization_id: run?.organization_id,
        workflow_id: run?.workflow_id,
        run_id: run?.id,
        node_id: nodeId,
        level,
        message
    });
}

async function markRunStatus(runId: string, status: string, updates: Record<string, any> = {}) {
    await getSupabaseAdmin().from('workflow_runs').update({
        status,
        ...updates,
        last_executed_at: new Date().toISOString()
    }).eq('id', runId);
}

async function advanceWorkflow(runId: string, nodeId: string, depth: number) {
    await getSupabaseAdmin().from('workflow_runs').update({
        current_node_id: nodeId,
        status: 'running',
        next_execution_at: new Date().toISOString()
    }).eq('id', runId);

    await processWorkflowRun(runId, depth);
}

function calculateDelay(data: any): Date {
    const duration = parseInt(data.duration || '0');
    const unit = data.unit || 'days';
    const date = new Date();

    if (unit === 'minutes') date.setMinutes(date.getMinutes() + duration);
    else if (unit === 'hours') date.setHours(date.getHours() + duration);
    else if (unit === 'days') date.setDate(date.getDate() + duration);

    return date;
}

async function executeEmailAction(run: WorkflowRun, node: RFNode) {
    const contact = run.contact as Contact;
    if (!contact?.email) throw new Error('Contact has no email');

    const templateId = node.data.templateId as string;
    if (!templateId) throw new Error('No template selected');

    // Using the same logic as the existing API route but cleaned up
    // Assuming sendEmail in lib/email-service handles the SMTP lookup internally
    // If not, we'd replicate the smtp lookup here.
    await sendEmail({
        to: contact.email,
        templateId,
        organizationId: run.organization_id,
        variables: {
            first_name: contact.first_name,
            last_name: contact.last_name || ''
        }
    });
}

async function evaluateCondition(run: WorkflowRun, node: RFNode): Promise<'true' | 'false'> {
    const { field, operator, value } = node.data;
    if (!field || !operator) return 'true'; // Default path if misconfigured

    const contactValue = (run.contact as any)[field as string];

    switch (operator) {
        case 'equals': return String(contactValue).trim().toLowerCase() === String(value).trim().toLowerCase() ? 'true' : 'false';
        case 'contains': return String(contactValue).toLowerCase().includes(String(value).toLowerCase()) ? 'true' : 'false';
        case 'exists': return !!contactValue ? 'true' : 'false';
        case 'greater_than': return Number(contactValue) > Number(value) ? 'true' : 'false';
        case 'less_than': return Number(contactValue) < Number(value) ? 'true' : 'false';
        default: return 'true';
    }
}

async function executeGeneralAction(run: WorkflowRun, node: RFNode) {
    const actionType = node.data.actionType;
    
    if (actionType === 'add_tag') {
        const tag = node.data.tag as string;
        if (!tag) return;
        
        const currentTags = run.contact.tags || [];
        if (!currentTags.includes(tag)) {
            await getSupabaseAdmin().from('contacts')
                .update({ tags: [...currentTags, tag] })
                .eq('id', run.contact_id);
            await logExecution(run, node.id, 'info', `Added tag: ${tag}`);
        }
    } 
    else if (actionType === 'calculate_score') {
        const { data: activities } = await getSupabaseAdmin()
            .from('activities')
            .select('*')
            .eq('contact_id', run.contact_id)
            .order('created_at', { ascending: false })
            .limit(20);

        const { data: apiKeys } = await getSupabaseAdmin()
            .from('api_keys')
            .select('*')
            .eq('organization_id', run.organization_id)
            .single();

        if (apiKeys) {
            const { generateContactScore } = await import('@/lib/ai-services');
            const result = await generateContactScore(run.contact as any, activities || [], apiKeys as any);
            if (result) {
                await getSupabaseAdmin().from('contacts')
                    .update({
                        lead_score: result.score,
                        score_reason: result.reason
                    })
                    .eq('id', run.contact_id);
                await logExecution(run, node.id, 'info', `AI Lead Score updated: ${result.score}`);
            }
        } else {
             await logExecution(run, node.id, 'error', `Cannot calculate lead score: Missing API Keys for organization`);
        }
    }
    // Reserved for future expansion natively described in the Builder UI
    else if (actionType === 'update_stage') {
        await logExecution(run, node.id, 'info', `Update stage action placeholder fired.`);
    }
    else if (actionType === 'assign_owner') {
        await logExecution(run, node.id, 'info', `Assign owner action placeholder fired.`);
    }
}

export async function evaluateTriggers(triggerType: string, organizationId: string, payload: { contactId: string; [key: string]: any }) {
    // 1. Fetch active workflows for this trigger
    const { data: workflows } = await getSupabaseAdmin()
        .from('workflows')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

    if (!workflows || workflows.length === 0) return;

    for (const workflow of workflows) {
        const nodes = workflow.nodes as RFNode[];
        const triggerNode = nodes.find(n => n.type === 'trigger' && n.data.triggerType === triggerType);

        if (!triggerNode) continue;

        // Check trigger specific conditions (e.g. formId routing)
        if (triggerType === 'lead_created' && triggerNode.data.formId && triggerNode.data.formId !== payload.formId) {
            continue; // Skip if this workflow is listening for a specific web form, but a different one was submitted
        }

        // 2. Create Workflow Run
        const { data: run, error: runError } = await getSupabaseAdmin()
            .from('workflow_runs')
            .insert({
                organization_id: organizationId,
                workflow_id: workflow.id,
                contact_id: payload.contactId,
                status: 'waiting', // Start waiting so the Cron can cleanly pick it up, or process it immediately below
                metadata: { trigger_payload: payload }
            })
            .select()
            .single();

        if (run && !runError) {
            // 3. Start processing immediately for the first node
            await processWorkflowRun(run.id, 0);
        } else if (runError) {
             console.error("Failed to insert workflow run:", runError);
        }
    }
}
