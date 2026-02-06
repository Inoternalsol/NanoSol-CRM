import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { subDays, startOfDay, format } from 'date-fns';

export interface AnalyticsData {
    calls: {
        total: number;
        connected: number;
        volumeByDay: { name: string; calls: number; connected: number }[];
    };
    tasks: {
        total: number;
        completed: number;
        pending: number;
        distribution: { name: string; value: number; color: string }[];
    };
    deals: {
        totalValue: number;
        count: number;
    };
}

interface CallMetadata {
    outcome?: string;
    [key: string]: unknown;
}

const fetchAnalytics = async (): Promise<AnalyticsData> => {
    const supabase = createClient();
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6); // Last 7 days including today

    // 1. Fetch Calls (Activities)
    const { data: callsData, error: callsError } = await supabase
        .from('activities')
        .select('created_at, metadata')
        .eq('type', 'call')
        .gte('created_at', startOfDay(sevenDaysAgo).toISOString());

    if (callsError) throw callsError;

    // Process Calls
    const volumeByDay = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(today, 6 - i);
        const dayStr = format(date, 'EEE'); // Mon, Tue...
        const dayCalls = callsData?.filter(c =>
            new Date(c.created_at).toDateString() === date.toDateString()
        ) || [];

        // Check if metadata indicates connection (assuming metadata.outcome or similar)
        // Adjust based on your actual metadata structure for calls
        const connectedCalls = dayCalls.filter(c => {
            const metadata = c.metadata as CallMetadata;
            const outcome = metadata?.outcome;
            return outcome === 'connected' || outcome === 'answered';
        });

        return {
            name: dayStr,
            calls: dayCalls.length,
            connected: connectedCalls.length
        };
    });

    const totalCalls = callsData?.length || 0;
    const totalConnected = callsData?.filter(c => {
        const metadata = c.metadata as CallMetadata;
        const outcome = metadata?.outcome;
        return outcome === 'connected' || outcome === 'answered';
    }).length || 0;


    // 2. Fetch Tasks
    const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('status');

    if (tasksError) throw tasksError;

    const totalTasks = tasksData?.length || 0;
    const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
    const pendingTasks = tasksData?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = tasksData?.filter(t => t.status === 'in_progress').length || 0;

    const taskDistribution = [
        { name: 'Completed', value: completedTasks, color: '#22c55e' },
        { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
        { name: 'Pending', value: pendingTasks, color: '#eab308' },
    ].filter(d => d.value > 0);


    // 3. Fetch Deals
    const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('value, stage');

    if (dealsError) throw dealsError;

    // Filter closed won deals for value calculation? Or total pipeline value?
    // Let's do total closed won for the "Deals Closed" card if stage='closed_won' exists, 
    // otherwise just sum all for now or filter by probability=100
    // Checking schema: stage TEXT. Let's assume 'closed_won' is a stage or prob=100.
    // For now, let's sum ALL deals to show pipeline value, or maybe closed deals.
    // Let's create a generic "Pipeline Value" metric.
    const totalDealValue = dealsData?.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 0;
    const dealCount = dealsData?.length || 0;

    return {
        calls: {
            total: totalCalls,
            connected: totalConnected,
            volumeByDay
        },
        tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            distribution: taskDistribution
        },
        deals: {
            totalValue: totalDealValue,
            count: dealCount
        }
    };
};

export function useAnalytics() {
    return useSWR('dashboard-analytics', fetchAnalytics, {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: false
    });
}
