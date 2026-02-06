/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("Checking 'contacts' table schema...");

    // Check for 'status' column
    const { data: cols, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'contacts')
        .eq('column_name', 'status');

    if (error) {
        // information_schema might be restricted. Try fetching one row.
        console.log("Cannot access information_schema, trying select...");
        const { error: selError } = await supabase.from('contacts').select('status').limit(1);
        if (selError) {
            console.log("Column 'status' likely MISSING (Select failed). error:", selError.message);
        } else {
            console.log("Column 'status' EXISTS.");
        }
    } else {
        if (cols && cols.length > 0) {
            console.log("Column 'status' EXISTS.");
        } else {
            console.log("Column 'status' MISSING.");
        }
    }

    console.log("Checking 'contact_statuses' table...");
    const { error: tableError } = await supabase.from('contact_statuses').select('count', { count: 'exact', head: true });
    if (tableError) {
        console.log("Table 'contact_statuses' MISSING or inaccesible. Error:", tableError.message);
    } else {
        console.log("Table 'contact_statuses' EXISTS.");
    }
}

checkSchema();
