
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkOwnership() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('--- Contacts Ownership ---');
        const { data: contacts } = await supabase.from('contacts').select('id, first_name, owner_id');
        contacts.forEach(c => console.log(`Contact: ${c.first_name} | Owner: ${c.owner_id}`));

        console.log('\n--- Deals Ownership ---');
        const { data: deals } = await supabase.from('deals').select('id, name, owner_id');
        deals.forEach(d => console.log(`Deal: ${d.name} | Owner: ${d.owner_id}`));

        console.log('\n--- Agent Profiles ---');
        const { data: profiles } = await supabase.from('profiles').select('id, email, role');
        profiles.forEach(p => console.log(`Profile: ${p.email} | ID: ${p.id} | Role: ${p.role}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkOwnership();
