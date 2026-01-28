
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkProfiles() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('Fetching profiles...');
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, role, full_name');

        if (error) {
            console.error('Error fetching profiles:', error);
            process.exit(1);
        }

        console.log('PROFILES_DATA_START');
        profiles.forEach(p => {
            console.log(`USER: ${p.email} | ROLE: ${p.role} | NAME: ${p.full_name} | ID: ${p.id}`);
        });
        console.log('PROFILES_DATA_END');

        const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
        const { count: dealCount } = await supabase.from('deals').select('*', { count: 'exact', head: true });

        console.log(`STATS: CONTACTS=${contactCount} | DEALS=${dealCount}`);
        process.exit(0);
    } catch (err) {
        console.error('Script error:', err);
        process.exit(1);
    }
}

checkProfiles();
