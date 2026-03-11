import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase env vars, skipping log check");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  const { data: runs, error } = await supabase
    .from('workflow_runs')
    .select(`
      id, status, metadata,
      workflow_logs (node_id, level, message, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) console.error("Error fetching runs:", error);
  console.log(JSON.stringify(runs, null, 2));
}

checkLogs();
