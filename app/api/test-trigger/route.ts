import { NextResponse } from 'next/server';
import { evaluateTriggers } from '@/lib/automations/engine';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        
        if (!payload.organization_id || !payload.contact_id) {
             return NextResponse.json({ error: "Missing required payload fields (organization_id, contact_id)" }, { status: 400 });
        }

        // Simulating the trigger event payload (e.g. from a form submission)
        const triggerPayload = {
            contactId: payload.contact_id,
            formId: payload.form_id || 'test_form',
            source: 'test_webhook'
        };

        // Fire the evaluation engine
        await evaluateTriggers('contact_created', payload.organization_id, triggerPayload);

        return NextResponse.json({ success: true, message: `Dispatched 'contact_created' event for contact ${payload.contact_id}` });
        
    } catch (err: any) {
        console.error("Test trigger failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
