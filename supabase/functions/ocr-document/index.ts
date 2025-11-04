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

  let document_id: string | undefined;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    document_id = body.document_id;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Starting OCR for document:', document_id);

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update document status
    await supabaseClient
      .from('documents')
      .update({ 
        processing_status: 'processing',
        ocr_attempted: true 
      })
      .eq('id', document_id);

    // Download the document
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document for OCR');
    }

    // Convert to base64 for GPT-4 Vision
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = document.file_type || 'application/pdf';
    const base64Image = `data:${mimeType};base64,${base64}`;

    console.log('Performing OCR with GPT-4 Vision...');

    // Use GPT-4 Vision for OCR
    const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert OCR system. Extract ALL text from the provided document image(s) as accurately as possible. Maintain structure, formatting, and layout where relevant. If the document is a PDF with multiple pages, extract text from all visible pages.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this document. Preserve formatting and structure.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      }),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('OCR API error:', ocrResponse.status, errorText);
      throw new Error(`OCR failed: ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    const extractedText = ocrResult.choices[0].message.content;

    console.log('OCR completed, extracted text length:', extractedText.length);

    // Update document with OCR status
    await supabaseClient
      .from('documents')
      .update({ 
        ocr_completed: true,
        processing_status: 'pending' // Reset to pending for analysis
      })
      .eq('id', document_id);

    // Now trigger compliance analysis with the OCR'd text
    const analysisResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-document`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id,
          document_text: extractedText,
          filename: document.original_name
        })
      }
    );

    if (!analysisResponse.ok) {
      console.error('Analysis trigger failed:', await analysisResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_text_length: extractedText.length,
        message: 'OCR completed and analysis triggered'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in OCR function:', error);
    
    // Log the failure if document_id is available
    if (document_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        
        await supabaseClient
          .from('documents')
          .update({ processing_status: 'failed' })
          .eq('id', document_id);
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'OCR processing failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});