import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { UserActivityLog } from '../_shared/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const logEntry: UserActivityLog = await req.json();

    // Validate required fields
    if (!logEntry.user_id || !logEntry.action_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id and action_type' }), { status: 400 });
    }

    const { error } = await supabase.from('user_activity_logs').insert([{
      user_id: logEntry.user_id,
      action_type: logEntry.action_type,
      document_id: logEntry.document_id,
      details: logEntry.details,
    }]);

    if (error) {
      console.error('Error logging user activity:', error);
      return new Response(JSON.stringify({ error: `DB Error: ${error.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    console.error('Error processing request:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
