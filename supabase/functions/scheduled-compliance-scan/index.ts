import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanConfiguration {
  user_id?: string;
  scan_type: 'full' | 'incremental' | 'targeted';
  document_filters?: {
    file_types?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    risk_levels?: string[];
  };
  notification_preferences?: {
    email: boolean;
    in_app: boolean;
    webhook?: string;
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

    const config: ScanConfiguration = await req.json();
    
    console.log('Starting scheduled compliance scan:', config.scan_type);

    const scanResults = {
      scan_id: crypto.randomUUID(),
      start_time: new Date().toISOString(),
      scan_type: config.scan_type,
      processed_documents: 0,
      new_issues: 0,
      critical_findings: 0,
      status: 'running' as const
    };

    // Get documents to scan based on configuration
    const documentsToScan = await getDocumentsForScan(supabaseClient, config);
    
    console.log(`Found ${documentsToScan.length} documents to scan`);

    const scanPromises = documentsToScan.map(async (doc) => {
      try {
        // Check if document needs re-analysis
        const needsAnalysis = await shouldAnalyzeDocument(supabaseClient, doc, config.scan_type);
        
        if (!needsAnalysis) {
          return { document_id: doc.id, status: 'skipped', reason: 'up_to_date' };
        }

        // Trigger compliance analysis
        const { data, error } = await supabaseClient.functions.invoke('analyze-compliance', {
          body: { document_id: doc.id }
        });

        if (error) {
          console.error(`Analysis failed for document ${doc.id}:`, error);
          return { document_id: doc.id, status: 'error', error: error.message };
        }

        scanResults.processed_documents++;
        
        // Check for critical findings
        if (data.risk_level === 'CRITICAL') {
          scanResults.critical_findings++;
        }

        return { document_id: doc.id, status: 'completed', data };

      } catch (error: unknown) {
        console.error(`Error processing document ${doc.id}:`, error);
        return { document_id: doc.id, status: 'error', error: error.message };
      }
    });

    // Process documents in batches to avoid overwhelming the system
    const batchSize = 5;
    const documentResults = [];
    
    for (let i = 0; i < scanPromises.length; i += batchSize) {
      const batch = scanPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      documentResults.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < scanPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    scanResults.status = 'completed';
    const completedTime = new Date().toISOString();

    // Generate scan summary
    const summary = await generateScanSummary(supabaseClient, documentResults, scanResults);

    // Send notifications if configured
    if (config.notification_preferences?.email) {
      await sendScanNotifications(supabaseClient, config, summary);
    }

    // Log audit event
    await supabaseClient.functions.invoke('log-audit-event', {
      body: {
        user_id: config.user_id,
        action: 'scheduled_compliance_scan',
        resource_type: 'scan',
        details: {
          scan_id: scanResults.scan_id,
          scan_type: config.scan_type,
          documents_processed: scanResults.processed_documents,
          critical_findings: scanResults.critical_findings,
          duration_ms: new Date(completedTime).getTime() - new Date(scanResults.start_time).getTime()
        }
      }
    });

    console.log('Scheduled compliance scan completed:', scanResults.scan_id);

    return new Response(JSON.stringify({
      success: true,
      scan_results: {
        ...scanResults,
        end_time: completedTime,
        document_results: documentResults,
        summary
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in scheduled-compliance-scan function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getDocumentsForScan(supabaseClient: any, config: ScanConfiguration) {
  let query = supabaseClient
    .from('documents')
    .select('*')
    .eq('processing_status', 'completed');

  if (config.user_id) {
    query = query.eq('user_id', config.user_id);
  }

  if (config.document_filters?.file_types?.length) {
    query = query.in('file_type', config.document_filters.file_types);
  }

  if (config.document_filters?.date_range) {
    query = query
      .gte('upload_date', config.document_filters.date_range.start)
      .lte('upload_date', config.document_filters.date_range.end);
  }

  const { data: documents, error } = await query;
  
  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  return documents || [];
}

async function shouldAnalyzeDocument(supabaseClient: any, document: any, scanType: string): Promise<boolean> {
  if (scanType === 'full') {
    return true;
  }

  // For incremental scans, check if document has been analyzed recently
  const { data: recentReports } = await supabaseClient
    .from('compliance_reports')
    .select('generated_at')
    .eq('document_id', document.id)
    .order('generated_at', { ascending: false })
    .limit(1);

  if (!recentReports || recentReports.length === 0) {
    return true; // Never analyzed
  }

  const lastAnalysis = new Date(recentReports[0].generated_at);
  const daysSinceAnalysis = (Date.now() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24);

  // Re-analyze if more than 30 days old for incremental scans
  return daysSinceAnalysis > 30;
}

async function generateScanSummary(supabaseClient: any, documentResults: any[], scanResults: any) {
  const summary = {
    total_documents: documentResults.length,
    processed: documentResults.filter(r => r.status === 'completed').length,
    skipped: documentResults.filter(r => r.status === 'skipped').length,
    errors: documentResults.filter(r => r.status === 'error').length,
    risk_distribution: Record<string, unknown> as Record<string, number>,
    top_issues: [] as any[],
    recommendations: [] as string[]
  };

  // Analyze completed documents
  const completedResults = documentResults.filter(r => r.status === 'completed' && r.data);
  
  for (const result of completedResults) {
    const riskLevel = result.data.risk_level;
    summary.risk_distribution[riskLevel] = (summary.risk_distribution[riskLevel] || 0) + 1;
  }

  // Get top issues from recent reports
  const { data: recentReports } = await supabaseClient
    .from('compliance_reports')
    .select(`
      issues_detected,
      recommendations,
      documents!inner(original_name)
    `)
    .in('document_id', completedResults.map(r => r.document_id))
    .order('generated_at', { ascending: false })
    .limit(10);

  if (recentReports) {
    const allIssues = recentReports
      .flatMap(r => r.issues_detected || [])
      .filter(issue => issue.severity === 'HIGH' || issue.severity === 'CRITICAL')
      .slice(0, 5);
    
    summary.top_issues = allIssues;

    const allRecommendations = recentReports
      .flatMap(r => r.recommendations || [])
      .filter(rec => rec.priority === 'HIGH')
      .map(rec => rec.action)
      .slice(0, 3);
    
    summary.recommendations = allRecommendations;
  }

  return summary;
}

async function sendScanNotifications(supabaseClient: any, config: ScanConfiguration, summary: any) {
  if (!config.user_id) return;

  try {
    // Send in-app notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: config.user_id,
        type: summary.risk_distribution.CRITICAL > 0 ? 'warning' : 'info',
        title: 'Scheduled Compliance Scan Complete',
        message: `Processed ${summary.processed} documents. ${summary.risk_distribution.CRITICAL || 0} critical issues found.`,
      });

    // Send email notification if enabled
    if (config.notification_preferences?.email) {
      await supabaseClient.functions.invoke('send-notification-email', {
        body: {
          user_id: config.user_id,
          document_name: `${summary.processed} documents`,
          risk_level: summary.risk_distribution.CRITICAL > 0 ? 'CRITICAL' : 'LOW',
          compliance_score: 85, // Average placeholder
          notification_type: 'scheduled_scan',
          additional_data: summary
        }
      });
    }

  } catch (error) {
    console.error('Error sending scan notifications:', error);
  }
}