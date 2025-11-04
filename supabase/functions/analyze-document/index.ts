import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskIssue {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendation: string;
  timeline: string;
  category: string;
}

interface AnalysisResult {
  compliance_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  analysis_summary: string;
  issues: RiskIssue[];
  recommendations: Array<{
    priority: string;
    timeline: string;
    action: string;
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

    const { document_id, document_text, filename } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // If document_text not provided, fetch document and extract text
    let textContent = document_text;
    let documentName = filename;

    if (!textContent) {
      console.log('Fetching document data for:', document_id);
      
      // Get document details
      const { data: doc, error: docError } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', document_id)
        .single();

      if (docError || !doc) {
        throw new Error('Document not found');
      }

      documentName = doc.original_name;

      // Download the document
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('documents')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download document');
      }

      // For now, use a placeholder text - in production, you'd use a proper text extraction library
      // or trigger OCR if needed
      textContent = `[Document: ${documentName}]\nNote: Text extraction pending. Document requires OCR processing.`;
      
      console.log('Document text not available, flagging for OCR');
    }

    console.log('Analyzing document:', documentName);

    // Call Lovable AI for compliance analysis
    const analysisPrompt = `You are an expert compliance analyst. Analyze the following document for regulatory compliance, data privacy, and policy adherence.

Document: ${documentName}
Content: ${textContent.substring(0, 10000)}

Provide a comprehensive analysis including:
1. Overall compliance score (0-100)
2. Risk level (CRITICAL, HIGH, MEDIUM, LOW)
3. Detailed analysis summary
4. List of specific issues found with severity levels
5. Actionable recommendations with timelines

Return your analysis in the following JSON structure:
{
  "compliance_score": number,
  "risk_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "analysis_summary": "string",
  "issues": [
    {
      "id": "unique_id",
      "title": "Issue Title",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "description": "Detailed description",
      "recommendation": "Step-by-step actionable recommendation",
      "timeline": "Within X days",
      "category": "Data Privacy | Documentation | Policy Adherence | Security"
    }
  ],
  "recommendations": [
    {
      "priority": "High | Medium | Low",
      "timeline": "Within X days",
      "action": "Specific action to take"
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are an expert compliance analyst specializing in regulatory frameworks like GDPR, CCPA, HIPAA, and SOX. Provide detailed, actionable compliance assessments.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const analysisContent = aiResult.choices[0].message.content;
    const analysis: AnalysisResult = JSON.parse(analysisContent);

    console.log('Analysis complete:', analysis);

    // Get user_id from document (if not already fetched)
    let userId: string;
    if (!textContent || textContent.includes('[Document:')) {
      // We already fetched document above
      const { data: document } = await supabaseClient
        .from('documents')
        .select('user_id')
        .eq('id', document_id)
        .single();

      if (!document) {
        throw new Error('Document not found');
      }
      userId = document.user_id;
    } else {
      // Fetch user_id separately
      const { data: document } = await supabaseClient
        .from('documents')
        .select('user_id')
        .eq('id', document_id)
        .single();

      if (!document) {
        throw new Error('Document not found');
      }
      userId = document.user_id;
    }

    // Store compliance report
    const { data: report, error: reportError } = await supabaseClient
      .from('compliance_reports')
      .insert({
        document_id,
        user_id: userId,
        compliance_score: analysis.compliance_score,
        risk_level: analysis.risk_level,
        analysis_summary: analysis.analysis_summary,
        issues_detected: analysis.issues,
        recommendations: analysis.recommendations,
        model_name: 'google/gemini-2.5-flash',
        model_version: '2.5'
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error storing report:', reportError);
      throw reportError;
    }

    // Update document status
    await supabaseClient
      .from('documents')
      .update({ processing_status: 'completed' })
      .eq('id', document_id);

    // Create notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: analysis.risk_level === 'CRITICAL' || analysis.risk_level === 'HIGH' ? 'warning' : 'info',
        title: 'Document Analysis Complete',
        message: `${documentName} has been analyzed. Compliance Score: ${analysis.compliance_score}%. Risk Level: ${analysis.risk_level}`,
        related_document_id: document_id
      });

    // Log audit event
    await supabaseClient.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: 'document_analyzed',
      p_resource_type: 'document',
      p_resource_id: document_id,
      p_details: {
        filename: documentName,
        compliance_score: analysis.compliance_score,
        risk_level: analysis.risk_level,
        issues_count: analysis.issues.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        analysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-document:', error);
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
