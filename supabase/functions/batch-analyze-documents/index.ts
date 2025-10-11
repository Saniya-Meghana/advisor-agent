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

    const { document_ids } = await req.json();

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      throw new Error('Invalid document_ids array');
    }

    console.log('Starting batch analysis for', document_ids.length, 'documents');

    // Process documents in batches of 3 to avoid overwhelming the system
    const batchSize = 3;
    const results = [];

    for (let i = 0; i < document_ids.length; i += batchSize) {
      const batch = document_ids.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (document_id: string) => {
        try {
          // Get document details
          const { data: doc, error: docError } = await supabaseClient
            .from('documents')
            .select('storage_path, filename, original_name, user_id')
            .eq('id', document_id)
            .single();

          if (docError || !doc) {
            throw new Error(`Document ${document_id} not found`);
          }

          // Download file content
          const { data: fileData, error: downloadError } = await supabaseClient.storage
            .from('documents')
            .download(doc.storage_path);

          if (downloadError || !fileData) {
            throw new Error(`Failed to download document ${document_id}`);
          }

          const fileText = await fileData.text();

          // Trigger analysis
          const { error: analysisError } = await supabaseClient.functions.invoke('analyze-document', {
            body: {
              document_id,
              document_text: fileText,
              filename: doc.original_name
            }
          });

          if (analysisError) {
            throw analysisError;
          }

          return { document_id, status: 'success' };
        } catch (error) {
          console.error(`Error processing document ${document_id}:`, error);
          return { 
            document_id, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < document_ids.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Batch analysis complete: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        successful: successCount,
        failed: errorCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in batch-analyze-documents:', error);
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
