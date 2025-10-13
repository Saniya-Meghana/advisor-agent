const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const commitId = process.env.COMMIT_ID;
const status = process.env.STATUS;

const supabase = createClient(supabaseUrl, supabaseKey);

async function logDeployment() {
  const { data, error } = await supabase
    .from('deploy_logs')
    .insert([{ commit_id: commitId, status: status }]);

  if (error) {
    console.error('Error logging deployment:', error);
    process.exit(1);
  }

  console.log('Deployment logged successfully:', data);
}

logDeployment();
