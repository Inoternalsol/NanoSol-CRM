import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processWorkflowRun } from '@/lib/automations/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic security block if triggered manually, but primarily meant to be invoked by Vercel Cron securely
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Find all workflow runs that are 'waiting' (paused on a delay node)
        // AND whose resume timestamp has tipped into the past
        const { data: pendingRuns, error } = await supabaseAdmin
            .from('workflow_runs')
            .select('id')
            .eq('status', 'waiting')
            .lte('next_execution_at', new Date().toISOString())
            .order('next_execution_at', { ascending: true })
            .limit(50); // Batch limit to prevent Vercel Function timeouts

        if (error) {
             console.error('Error fetching pending workflows:', error);
             return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!pendingRuns || pendingRuns.length === 0) {
            return NextResponse.json({ message: 'No pending workflows to process' });
        }

        // 2. Fire them up concurrently
        const runPromises = pendingRuns.map(run => processWorkflowRun(run.id, 0));
        
        // Wait for all to finish (engine.ts recursively calls itself sequentially per node, 
        // so this awaits the entire remainder of the drip campaign for each contact, assuming it doesn't hit another delay)
        await Promise.allSettled(runPromises);

        return NextResponse.json({ 
            message: `Successfully processed ${pendingRuns.length} workflows`,
            processedCount: pendingRuns.length
        });
        
    } catch (error: any) {
        console.error('Cron process-workflows failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
