import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MIGRATION_FILE = 'supabase/migrations/20240522120000_add_last_call_to_contacts.sql';

function applyMigration() {
    const filePath = path.join(process.cwd(), MIGRATION_FILE);

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Migration file not found: ${filePath}`);
            return;
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`\n--- Migration Content (${MIGRATION_FILE}) ---\n`);
        console.log(sql);
        console.log(`\n----------------------------------------------\n`);
        console.log("NOTE: Automatic SQL execution is not enabled for the JS client.");
        console.log("Please copy the SQL above and run it in the Supabase SQL Editor:");
        console.log("https://supabase.com/dashboard/project/_/sql");

    } catch (error) {
        console.error("Error reading migration file:", error);
    }
}

applyMigration();
