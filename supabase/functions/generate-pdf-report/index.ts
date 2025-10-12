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

    const { report_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating PDF report for:', report_id);

    // Fetch the report with document details
    const { data: report, error: reportError } = await supabaseClient
      .from('compliance_reports')
      .select(`
        *,
        documents (
          filename,
          original_name,
          file_type,
          upload_date
        )
      `)
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Generate HTML report with charts
    const htmlContent = generateHTMLReport(report);

    // Use Claude to generate a professional PDF layout
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          {
            role: 'user',
            content: `Generate a professional compliance report summary in markdown format for the following data:
            
Document: ${report.documents.original_name}
Compliance Score: ${report.compliance_score}%
Risk Level: ${report.risk_level}
Analysis Summary: ${report.analysis_summary}

Issues Detected: ${JSON.stringify(report.issues_detected, null, 2)}
Recommendations: ${JSON.stringify(report.recommendations, null, 2)}

Format this as a professional executive summary with sections for:
1. Executive Summary
2. Risk Assessment
3. Key Findings
4. Detailed Issues
5. Action Plan
6. Recommendations`
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('Failed to generate report summary');
    }

    const aiResult = await aiResponse.json();
    const reportSummary = aiResult.choices[0].message.content;

    // Store the generated report
    const pdfFilename = `compliance-report-${report_id}-${Date.now()}.html`;
    const fullReport = `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report - ${report.documents.original_name}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .risk-critical { background: #ef4444; color: white; padding: 5px 10px; border-radius: 4px; }
    .risk-high { background: #f97316; color: white; padding: 5px 10px; border-radius: 4px; }
    .risk-medium { background: #eab308; color: white; padding: 5px 10px; border-radius: 4px; }
    .risk-low { background: #22c55e; color: white; padding: 5px 10px; border-radius: 4px; }
    .score-card { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #3b82f6; color: white; }
    .chart-container { margin: 30px 0; }
  </style>
</head>
<body>
  <h1>Compliance Analysis Report</h1>
  <div class="score-card">
    <h2>Document Information</h2>
    <p><strong>Document:</strong> ${report.documents.original_name}</p>
    <p><strong>Upload Date:</strong> ${new Date(report.documents.upload_date).toLocaleDateString()}</p>
    <p><strong>Analysis Date:</strong> ${new Date(report.generated_at).toLocaleDateString()}</p>
    <p><strong>Model:</strong> ${report.model_name} v${report.model_version}</p>
  </div>

  <div class="score-card">
    <h2>Risk Overview</h2>
    <p><strong>Overall Risk Level:</strong> <span class="risk-${report.risk_level.toLowerCase()}">${report.risk_level}</span></p>
    <p><strong>Compliance Score:</strong> ${report.compliance_score}%</p>
    <div style="background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin-top: 10px;">
      <div style="background: ${report.compliance_score >= 80 ? '#22c55e' : report.compliance_score >= 60 ? '#eab308' : '#ef4444'}; height: 100%; width: ${report.compliance_score}%;"></div>
    </div>
  </div>

  ${reportSummary}

  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #6b7280;">
    <p>Generated by Risk & Compliance Advisor AI</p>
    <p>Confidential - For Internal Use Only</p>
  </footer>
</body>
</html>
    `;

    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(`reports/${report.user_id}/${pdfFilename}`, new Blob([fullReport], { type: 'text/html' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(`reports/${report.user_id}/${pdfFilename}`);

    // Log audit event
    await supabaseClient.rpc('log_audit_event', {
      p_user_id: report.user_id,
      p_action: 'pdf_report_generated',
      p_resource_type: 'compliance_report',
      p_resource_id: report_id,
      p_details: { filename: pdfFilename }
    });

    return new Response(
      JSON.stringify({
        success: true,
        download_url: urlData.publicUrl,
        filename: pdfFilename
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-pdf-report:', error);
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

function generateHTMLReport(report: any): string {
  // Generate visual representation of data
  return `<div>Report HTML content placeholder</div>`;
}
