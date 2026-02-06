
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const output = [];

    output.push('--- sequence_enrollments ---');
    const { data: enrollment } = await supabase.from('sequence_enrollments').select('*').limit(1);
    if (enrollment && enrollment.length > 0) {
        output.push(JSON.stringify(Object.keys(enrollment[0])));
    } else {
        output.push('No data in sequence_enrollments');
        // Try to get columns via RPC or a fake select if possible, but let's just see if we can find one record.
    }

    fs.writeFileSync('enrollment_schema.txt', output.join('\n'));
    process.exit(0);
}
checkSchema();
