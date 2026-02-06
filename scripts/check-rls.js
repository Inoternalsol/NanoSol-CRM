
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRLS() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: policies, error } = await supabase.rpc('get_policies', { table_name: 'sequence_enrollments' });

    if (error) {
        // Fallback: try raw query via pg_policies if RPC not available
        const { data: pgPolicies, error: pgError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'sequence_enrollments');

        if (pgError) {
            console.log('Error fetching policies:', pgError);
            // Try one more way: a simple query that might fail if RLS is on and we are not admin
            console.log('Trying direct query on pg_catalog via select...');
            const { data: catData, error: catError } = await supabase.from('pg_policies').select('*').eq('tablename', 'sequence_enrollments');
            console.log('Result:', catData || catError);
        } else {
            console.log('Policies (pg_policies):', pgPolicies);
        }
    } else {
        console.log('Policies (RPC):', policies);
    }
    process.exit(0);
}
// Actually, let's just use a raw SQL approach if we can, but we can't via the client directly without RPC.
// I will just use a node script that does a select from pg_policies if the service key allows it (it should).
checkRLS();
