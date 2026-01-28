
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyRls() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('--- RLS Status Check ---');
        const tables = ['contacts', 'deals', 'tasks', 'activities', 'profiles'];

        for (const table of tables) {
            const { data, error } = await supabase.rpc('get_table_rls_status', { table_name: table });
            // Since I don't have that RPC, I'll use a direct query to pg_tables/pg_class if possible
            // But I can't run arbitrary SQL via supabase-js unless I have an RPC.
            // Let's try to fetch something with and without a user session.
        }

        // Alternative: Fetch roles for all profiles again to be sure
        const { data: profiles } = await supabase.from('profiles').select('email, role');
        console.log('Profiles:', profiles);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verifyRls();
