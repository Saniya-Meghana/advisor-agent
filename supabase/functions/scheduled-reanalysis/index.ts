import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting scheduled re-analysis check');

    // Find documents that need re-analysis (older than 30 days and high/critical risk)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reportsToReanalyze, error: queryError } = await supabaseClient
      .from('compliance_reports')
      .select(`
        id,
        document_id,
        risk_level,
        generated_at,
        documents (
          id,
          storage_path,
          original_name,
          user_id
        )
      `)
      .lt('generated_at', thirtyDaysAgo.toISOString())
      .in('risk_level', ['HIGH', 'CRITICAL'])
      .limit(10); // Process max 10 documents per run

    if (queryError) {
      throw queryError;
    }

    if (!reportsToReanalyze || reportsToReanalyze.length === 0) {
      console.log('No documents require re-analysis');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No documents require re-analysis',
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${reportsToReanalyze.length} documents to re-analyze`);

    // Trigger batch analysis
    const documentIds = reportsToReanalyze.map(r => r.document_id);
    
    const { error: batchError } = await supabaseClient.functions.invoke('batch-analyze-documents', {
      body: { document_ids: documentIds }
    });

    if (batchError) {
      throw batchError;
    }

    // Create notifications for affected users
    const notifications = reportsToReanalyze.map(report => ({
      user_id: report.documents.user_id,
      type: 'info',
      title: 'Scheduled Re-analysis Complete',
      message: `Document "${report.documents.original_name}" has been re-analyzed as part of scheduled compliance monitoring.`,
      related_document_id: report.document_id
    }));

    await supabaseClient
      .from('notifications')
      .insert(notifications);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled re-analysis initiated for ${reportsToReanalyze.length} documents`,
        count: reportsToReanalyze.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in scheduled-reanalysis:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
