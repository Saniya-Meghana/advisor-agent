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

    const { report_id, format = 'json' } = await req.json();

    // Fetch the report
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

    console.log('Exporting report:', report_id, 'format:', format);

    if (format === 'csv') {
      // Generate CSV for issues
      const csvRows = [
        ['Issue ID', 'Title', 'Severity', 'Category', 'Description', 'Recommendation', 'Timeline']
      ];

      report.issues_detected.forEach((issue: any) => {
        csvRows.push([
          issue.id || '',
          issue.title || '',
          issue.severity || '',
          issue.category || '',
          issue.description || '',
          issue.recommendation || '',
          issue.timeline || ''
        ]);
      });

      const csvContent = csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${report_id}.csv"`
        },
      });
    }

    // JSON export
    const exportData = {
      report_id: report.id,
      document: {
        filename: report.documents.filename,
        original_name: report.documents.original_name,
        file_type: report.documents.file_type,
        upload_date: report.documents.upload_date
      },
      analysis: {
        generated_at: report.generated_at,
        compliance_score: report.compliance_score,
        risk_level: report.risk_level,
        analysis_summary: report.analysis_summary,
        model: `${report.model_name} v${report.model_version}`
      },
      issues_detected: report.issues_detected,
      recommendations: report.recommendations
    };

    // Log audit event
    await supabaseClient.rpc('log_audit_event', {
      p_user_id: report.user_id,
      p_action: 'report_exported',
      p_resource_type: 'compliance_report',
      p_resource_id: report_id,
      p_details: { format }
    });

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="compliance-report-${report_id}.json"`
        },
      }
    );

  } catch (error) {
    console.error('Error in export-compliance-report:', error);
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
