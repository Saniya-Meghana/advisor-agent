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

    const { document_id, document_text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Extracting entities for document:', document_id);

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Use AI to extract entities
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert entity extraction system specializing in detecting sensitive information in documents.

Extract ALL instances of the following entity types:
- PII (Personally Identifiable Information): names, emails, phone numbers, addresses, SSN
- PHI (Protected Health Information): medical record numbers, patient IDs, diagnoses, treatments
- Financial: credit card numbers, bank account numbers, routing numbers, financial data
- Confidential: trade secrets, proprietary information, confidential agreements

Return a JSON array of entities with this structure:
{
  "entities": [
    {
      "entity_type": "pii|phi|financial|confidential",
      "entity_category": "email|ssn|credit_card|medical_record|etc",
      "entity_value": "the actual extracted value",
      "masked_value": "masked version (e.g., ****1234)",
      "confidence_score": 0.95,
      "severity": "low|medium|high|critical"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Extract entities from this document:\n\n${document_text.slice(0, 10000)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_entities",
            description: "Extract sensitive entities from document",
            parameters: {
              type: "object",
              properties: {
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity_type: { type: "string", enum: ["pii", "phi", "financial", "confidential"] },
                      entity_category: { type: "string" },
                      entity_value: { type: "string" },
                      masked_value: { type: "string" },
                      confidence_score: { type: "number", minimum: 0, maximum: 1 },
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
                    },
                    required: ["entity_type", "entity_category", "entity_value", "confidence_score", "severity"],
                    additionalProperties: false
                  }
                }
              },
              required: ["entities"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_entities" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Entity extraction API error:', errorText);
      throw new Error(`Entity extraction failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0].message.tool_calls[0];
    const entitiesData = JSON.parse(toolCall.function.arguments);
    const entities = entitiesData.entities || [];

    console.log(`Extracted ${entities.length} entities`);

    // Store entities in database
    for (const entity of entities) {
      await supabaseClient.from('entity_extractions').insert({
        document_id,
        user_id: document.user_id,
        ...entity,
        location: null, // TODO: Add location tracking
        metadata: {
          extraction_model: 'google/gemini-2.5-flash',
          extraction_date: new Date().toISOString(),
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        entities_found: entities.length,
        entities
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in extract-entities function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Entity extraction failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
