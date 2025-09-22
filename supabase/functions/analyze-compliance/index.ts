import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceAnalysisResult {
  compliance_score: number;
  risk_level: string;
  issues_detected: Array<{
    category: string;
    severity: string;
    description: string;
    recommendation: string;
    regulation: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    timeline: string;
    impact: string;
  }>;
  analysis_summary: string;
  clause_scores: Record<string, number>;
  evidence_chunks: Array<{
    text: string;
    page: number;
    confidence: number;
    regulation_match: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { document_id } = await req.json();
    
    if (!document_id) {
      throw new Error('Document ID is required');
    }

    console.log('Processing compliance analysis for document:', document_id);

    // Fetch document details
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update status to processing
    await supabaseClient
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // Download document content
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    const documentText = await fileData.text();
    
    // Get active regulation templates
    const { data: templates } = await supabaseClient
      .from('regulation_templates')
      .select('*')
      .eq('is_active', true);

    // Perform AI analysis
    const analysisResult = await analyzeDocumentWithAI(
      documentText, 
      document.original_name, 
      templates || []
    );

    // Save compliance report
    const { data: report, error: reportError } = await supabaseClient
      .from('compliance_reports')
      .insert({
        document_id: document_id,
        user_id: document.user_id,
        compliance_score: analysisResult.compliance_score,
        risk_level: analysisResult.risk_level,
        issues_detected: analysisResult.issues_detected,
        recommendations: analysisResult.recommendations,
        analysis_summary: analysisResult.analysis_summary,
        clause_scores: analysisResult.clause_scores,
        evidence_chunks: analysisResult.evidence_chunks,
        model_name: 'gpt-4o-mini',
        model_version: '2.0'
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Update document status to completed
    await supabaseClient
      .from('documents')
      .update({ processing_status: 'completed' })
      .eq('id', document_id);

    // Create notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: document.user_id,
        type: analysisResult.risk_level === 'CRITICAL' ? 'warning' : 'info',
        title: 'Compliance Analysis Complete',
        message: `Analysis completed for ${document.original_name}. Risk Level: ${analysisResult.risk_level}`,
        related_document_id: document_id
      });

    // Send email notification
    await supabaseClient.functions.invoke('send-notification-email', {
      body: {
        user_id: document.user_id,
        document_name: document.original_name,
        risk_level: analysisResult.risk_level,
        compliance_score: analysisResult.compliance_score
      }
    });

    console.log('Compliance analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      report_id: report.id,
      compliance_score: analysisResult.compliance_score,
      risk_level: analysisResult.risk_level
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in analyze-compliance function:', error);
    
    // Update document status to error if document_id exists
    try {
      const { document_id } = await req.json();
      if (document_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        
        await supabaseClient
          .from('documents')
          .update({ processing_status: 'error' })
          .eq('id', document_id);
      }
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeDocumentWithAI(
  documentText: string, 
  filename: string, 
  templates: any[]
): Promise<ComplianceAnalysisResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const regulationContext = templates.map(t => `
    Regulation: ${t.name}
    Description: ${t.description}
    Requirements: ${JSON.stringify(t.template_data)}
  `).join('\n\n');

  const prompt = `
As an expert compliance analyst, perform a comprehensive analysis of the following document against relevant regulations and standards.

Document: ${filename}
Content: ${documentText}

Available Regulation Templates:
${regulationContext}

Provide a detailed JSON response with the following structure:
{
  "compliance_score": number (0-100),
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "issues_detected": [
    {
      "category": "string",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL", 
      "description": "string",
      "recommendation": "string",
      "regulation": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "LOW|MEDIUM|HIGH",
      "action": "string", 
      "timeline": "string",
      "impact": "string"
    }
  ],
  "analysis_summary": "string",
  "clause_scores": {
    "regulation_name": number
  },
  "evidence_chunks": [
    {
      "text": "string",
      "page": number,
      "confidence": number,
      "regulation_match": "string" 
    }
  ]
}

Focus on:
1. Data privacy and security compliance (GDPR, CCPA, etc.)
2. Financial regulations (SOX, PCI-DSS, etc.)
3. Industry-specific standards (HIPAA, etc.)
4. Operational risk assessment
5. Documentation completeness
6. Policy adherence

Provide actionable recommendations and specific risk mitigation strategies.
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
            content: 'You are an expert compliance analyst with deep knowledge of regulatory frameworks, risk assessment, and document analysis. Always respond with valid JSON.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const analysisResult = JSON.parse(content);
      
      // Validate and set defaults
      return {
        compliance_score: Math.max(0, Math.min(100, analysisResult.compliance_score || 0)),
        risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(analysisResult.risk_level) 
          ? analysisResult.risk_level 
          : 'MEDIUM',
        issues_detected: Array.isArray(analysisResult.issues_detected) 
          ? analysisResult.issues_detected 
          : [],
        recommendations: Array.isArray(analysisResult.recommendations) 
          ? analysisResult.recommendations 
          : [],
        analysis_summary: analysisResult.analysis_summary || 'Analysis completed',
        clause_scores: analysisResult.clause_scores || Record<string, unknown>,
        evidence_chunks: Array.isArray(analysisResult.evidence_chunks) 
          ? analysisResult.evidence_chunks 
          : []
      };
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Invalid AI response format');
    }

  } catch (aiError: any) {
    console.error('AI analysis error:', aiError);
    
    // Return default analysis on AI failure
    return {
      compliance_score: 50,
      risk_level: 'MEDIUM',
      issues_detected: [{
        category: 'Analysis Error',
        severity: 'MEDIUM',
        description: 'AI analysis failed - manual review required',
        recommendation: 'Please review document manually or retry analysis',
        regulation: 'General'
      }],
      recommendations: [{
        priority: 'HIGH',
        action: 'Retry automated analysis or conduct manual review',
        timeline: 'Immediate',
        impact: 'Compliance verification pending'
      }],
      analysis_summary: 'Automated analysis encountered an error. Manual review recommended.',
      clause_scores: Record<string, unknown>,
      evidence_chunks: []
    };
  }
}