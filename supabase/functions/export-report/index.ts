import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  report_ids: string[];
  format: 'pdf' | 'csv' | 'json' | 'xlsx';
  include_charts?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
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

    const { report_ids, format, include_charts = false, date_range }: ExportRequest = await req.json();

    if (!report_ids || report_ids.length === 0) {
      throw new Error('Report IDs are required');
    }

    // Fetch reports with documents
    let query = supabaseClient
      .from('compliance_reports')
      .select(`
        *,
        documents!inner(original_name, file_type, upload_date)
      `)
      .in('id', report_ids);

    if (date_range) {
      query = query
        .gte('generated_at', date_range.start)
        .lte('generated_at', date_range.end);
    }

    const { data: reports, error } = await query.order('generated_at', { ascending: false });

    if (error) throw error;

    if (!reports || reports.length === 0) {
      throw new Error('No reports found');
    }

    let exportData: any;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        exportData = generateJSONExport(reports);
        contentType = 'application/json';
        filename = `compliance-reports-${new Date().toISOString().split('T')[0]}.json`;
        break;
        
      case 'csv':
        exportData = generateCSVExport(reports);
        contentType = 'text/csv';
        filename = `compliance-reports-${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'xlsx':
        exportData = await generateExcelExport(reports);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `compliance-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
        
      case 'pdf':
        exportData = await generatePDFExport(reports, include_charts);
        contentType = 'application/pdf';
        filename = `compliance-reports-${new Date().toISOString().split('T')[0]}.pdf`;
        break;
        
      default:
        throw new Error('Unsupported export format');
    }

    // Store export file in Supabase Storage for download
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(`exports/${filename}`, exportData, {
        contentType,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Generate signed URL for download
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from('documents')
      .createSignedUrl(`exports/${filename}`, 3600); // 1 hour expiry

    if (urlError) throw urlError;

    console.log('Report export generated successfully:', filename);

    return new Response(JSON.stringify({
      success: true,
      download_url: signedUrl.signedUrl,
      filename,
      format,
      report_count: reports.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in export-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateJSONExport(reports: any[]): string {
  const exportData = {
    export_date: new Date().toISOString(),
    total_reports: reports.length,
    reports: reports.map(report => ({
      id: report.id,
      document_name: report.documents.original_name,
      compliance_score: report.compliance_score,
      risk_level: report.risk_level,
      generated_at: report.generated_at,
      analysis_summary: report.analysis_summary,
      issues_count: Array.isArray(report.issues_detected) ? report.issues_detected.length : 0,
      recommendations_count: Array.isArray(report.recommendations) ? report.recommendations.length : 0,
      issues_detected: report.issues_detected,
      recommendations: report.recommendations,
      clause_scores: report.clause_scores
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

function generateCSVExport(reports: any[]): string {
  const headers = [
    'Report ID',
    'Document Name',
    'Compliance Score',
    'Risk Level',
    'Generated Date',
    'Issues Count',
    'Recommendations Count',
    'Analysis Summary'
  ];

  const rows = reports.map(report => [
    report.id,
    `"${report.documents.original_name}"`,
    report.compliance_score,
    report.risk_level,
    report.generated_at,
    Array.isArray(report.issues_detected) ? report.issues_detected.length : 0,
    Array.isArray(report.recommendations) ? report.recommendations.length : 0,
    `"${(report.analysis_summary || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

async function generateExcelExport(reports: any[]): Promise<ArrayBuffer> {
  // For production, you would use a library like exceljs
  // For now, return CSV data as fallback
  const csvData = generateCSVExport(reports);
  return new TextEncoder().encode(csvData).buffer;
}

async function generatePDFExport(reports: any[], includeCharts: boolean): Promise<ArrayBuffer> {
  // For production, you would use a library like puppeteer or jsPDF
  // For now, return HTML content that could be converted to PDF
  const htmlContent = generateHTMLReport(reports, includeCharts);
  
  // This would normally be converted to PDF using a service
  return new TextEncoder().encode(htmlContent).buffer;
}

function generateHTMLReport(reports: any[], includeCharts: boolean): string {
  const totalReports = reports.length;
  const avgScore = reports.reduce((sum, r) => sum + (r.compliance_score || 0), 0) / totalReports;
  const riskDistribution = reports.reduce((acc, r) => {
    acc[r.risk_level] = (acc[r.risk_level] || 0) + 1;
    return acc;
  }, Record<string, unknown> as Record<string, number>);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compliance Reports Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .report { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
    .risk-low { background-color: #d4edda; }
    .risk-medium { background-color: #fff3cd; }
    .risk-high { background-color: #f8d7da; }
    .risk-critical { background-color: #f5c6cb; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compliance Reports Export</h1>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="summary">
    <h2>Executive Summary</h2>
    <p><strong>Total Reports:</strong> ${totalReports}</p>
    <p><strong>Average Compliance Score:</strong> ${avgScore.toFixed(1)}%</p>
    <p><strong>Risk Distribution:</strong></p>
    <ul>
      ${Object.entries(riskDistribution).map(([risk, count]) => 
        `<li>${risk}: ${count} (${((count/totalReports)*100).toFixed(1)}%)</li>`
      ).join('')}
    </ul>
  </div>

  <h2>Detailed Reports</h2>
  ${reports.map(report => `
    <div class="report risk-${report.risk_level.toLowerCase()}">
      <h3>${report.documents.original_name}</h3>
      <p><strong>Compliance Score:</strong> ${report.compliance_score}%</p>
      <p><strong>Risk Level:</strong> ${report.risk_level}</p>
      <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleDateString()}</p>
      <p><strong>Summary:</strong> ${report.analysis_summary || 'No summary available'}</p>
      
      ${Array.isArray(report.issues_detected) && report.issues_detected.length > 0 ? `
        <h4>Issues Detected (${report.issues_detected.length})</h4>
        <ul>
          ${report.issues_detected.map((issue: any) => `
            <li><strong>${issue.category}</strong> (${issue.severity}): ${issue.description}</li>
          `).join('')}
        </ul>
      ` : ''}
      
      ${Array.isArray(report.recommendations) && report.recommendations.length > 0 ? `
        <h4>Recommendations (${report.recommendations.length})</h4>
        <ul>
          ${report.recommendations.map((rec: any) => `
            <li><strong>${rec.priority} Priority:</strong> ${rec.action}</li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('')}

  <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
    <p>Risk & Compliance Management System - Confidential Report</p>
  </div>
</body>
</html>
  `;
}