import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceAnalysisResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  compliance_score: number;
  issues_detected: Array<{
    category: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    timeline: string;
  }>;
  analysis_summary: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting compliance analysis for document: ${document_id}`);

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update document status to processing
    await supabaseClient
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // Download document content from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError) {
      throw new Error('Failed to download document');
    }

    // Convert file to text (simplified - in real implementation would use proper PDF/DOCX parsers)
    const fileText = await fileData.text();
    
    // Analyze document with AI
    const analysisResult = await analyzeDocumentWithAI(fileText, document.original_name);

    // Save analysis results
    const { error: reportError } = await supabaseClient
      .from('compliance_reports')
      .insert({
        document_id: document_id,
        user_id: document.user_id,
        risk_level: analysisResult.risk_level,
        compliance_score: analysisResult.compliance_score,
        issues_detected: analysisResult.issues_detected,
        recommendations: analysisResult.recommendations,
        analysis_summary: analysisResult.analysis_summary
      });

    if (reportError) {
      throw new Error('Failed to save analysis results');
    }

    // Update document status to completed
    await supabaseClient
      .from('documents')
      .update({ processing_status: 'completed' })
      .eq('id', document_id);

    console.log(`Compliance analysis completed for document: ${document_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compliance analysis completed',
        analysis: analysisResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Compliance analysis error:', error);

    // If we have a document_id, update its status to error
    if (req.json && typeof req.json === 'function') {
      try {
        const { document_id } = await req.json();
        if (document_id) {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          
          await supabaseClient
            .from('documents')
            .update({ processing_status: 'error' })
            .eq('id', document_id);
        }
      } catch (e) {
        console.error('Failed to update document status to error:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'Compliance analysis failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeDocumentWithAI(documentText: string, filename: string): Promise<ComplianceAnalysisResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
You are a compliance and risk assessment expert. Analyze the following document and provide a comprehensive compliance assessment.

Document Name: ${filename}
Document Content:
${documentText.substring(0, 8000)} // Limit content for API

Please analyze this document for:
1. Regulatory compliance issues
2. Risk factors
3. Data privacy concerns
4. Financial compliance
5. Operational risks
6. Legal implications

Provide your response in the following JSON format:
{
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "compliance_score": [number from 0-100],
  "issues_detected": [
    {
      "category": "string",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL", 
      "description": "string",
      "recommendation": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "string", 
      "timeline": "string"
    }
  ],
  "analysis_summary": "string - comprehensive summary of findings"
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compliance and risk assessment expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      
      // Fallback analysis if AI response parsing fails
      return {
        risk_level: 'MEDIUM',
        compliance_score: 75,
        issues_detected: [
          {
            category: 'Document Review',
            severity: 'MEDIUM',
            description: 'Document requires manual review due to AI parsing limitations',
            recommendation: 'Conduct manual compliance assessment'
          }
        ],
        recommendations: [
          {
            priority: 'HIGH',
            action: 'Schedule manual document review with compliance team',
            timeline: '7 days'
          }
        ],
        analysis_summary: 'Automated analysis partially completed. Manual review recommended for comprehensive compliance assessment.'
      };
    }

  } catch (error) {
    console.error('AI Analysis error:', error);
    
    // Fallback analysis if AI call fails
    return {
      risk_level: 'MEDIUM',
      compliance_score: 50,
      issues_detected: [
        {
          category: 'Analysis Error',
          severity: 'HIGH',
          description: 'Automated analysis failed - manual review required',
          recommendation: 'Conduct comprehensive manual compliance review'
        }
      ],
      recommendations: [
        {
          priority: 'HIGH',
          action: 'Escalate to compliance team for manual analysis',
          timeline: '3 days'
        }
      ],
      analysis_summary: 'Automated compliance analysis encountered technical issues. Manual expert review is required to ensure comprehensive compliance assessment.'
    };
  }
}