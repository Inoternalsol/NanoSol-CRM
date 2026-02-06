
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSmtp() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('smtp_configs').select('*').limit(1).single();
    if (data) {
        console.log('SMTP_COLUMNS:', Object.keys(data).join(', '));
    } else {
        console.log('No SMTP config found or error:', error?.message);
    }
    process.exit(0);
}
checkSmtp();
