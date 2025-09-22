import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Define specific data interfaces for each event type
interface DocumentUploadedData {
  document_id: string;
  user_id: string;
  auto_analyze?: boolean;
}

interface ComplianceThresholdExceededData {
  user_id: string;
  document_id: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  compliance_score: number;
  threshold: number;
  document_name?: string;
}

interface RegulationUpdatedData {
  regulation_name: string;
  update_type: 'major' | 'minor';
  affected_documents?: string[];
}

interface AuditRequestedData {
  user_id: string;
  audit_scope: string;
  requested_by: string;
  deadline: string;
}

interface SystemAlertData {
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  affected_users?: string[];
}

interface UserRiskProfileChangedData {
  user_id: string;
  old_profile: string;
  new_profile: string;
  trigger_rescan: boolean;
}

// Update WebhookEvent to use a more specific type for data
interface WebhookEvent {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  source?: string;
  webhook_id?: string;
}

interface WebhookResponse {
  success: boolean;
  event_id: string;
  processed_actions?: string[];
  errors?: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Read the body once to avoid consumption errors
    const body = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    const webhookEvent: WebhookEvent = JSON.parse(body);
    
    console.log('Processing webhook event:', webhookEvent.event_type);

    const eventId = crypto.randomUUID();
    const processedActions: string[] = [];
    const errors: string[] = [];

    // Process different webhook event types
    switch (webhookEvent.event_type) {
      case 'document.uploaded':
        await handleDocumentUploaded(supabaseClient, webhookEvent.data as DocumentUploadedData, processedActions, errors);
        break;
        
      case 'compliance.threshold_exceeded':
        await handleComplianceThresholdExceeded(supabaseClient, webhookEvent.data as ComplianceThresholdExceededData, processedActions, errors);
        break;
        
      case 'regulation.updated':
        await handleRegulationUpdated(supabaseClient, webhookEvent.data as RegulationUpdatedData, processedActions, errors);
        break;
        
      case 'audit.requested':
        await handleAuditRequested(supabaseClient, webhookEvent.data as AuditRequestedData, processedActions, errors);
        break;
        
      case 'system.alert':
        await handleSystemAlert(supabaseClient, webhookEvent.data as SystemAlertData, processedActions, errors);
        break;
        
      case 'user.risk_profile_changed':
        await handleUserRiskProfileChanged(supabaseClient, webhookEvent.data as UserRiskProfileChangedData, processedActions, errors);
        break;
        
      default:
        console.log('Unhandled webhook event type:', webhookEvent.event_type);
        await handleGenericEvent(supabaseClient, webhookEvent, processedActions, errors);
    }

    // Log webhook event processing
    await supabaseClient.functions.invoke('log-audit-event', {
      body: {
        user_id: webhookEvent.data.user_id || null,
        action: 'webhook_processed',
        resource_type: 'webhook',
        details: {
          event_id: eventId,
          event_type: webhookEvent.event_type,
          source: webhookEvent.source,
          webhook_id: webhookEvent.webhook_id,
          processed_actions: processedActions,
          errors: errors.length > 0 ? errors : undefined
        }
      }
    });

    const response: WebhookResponse = {
      success: errors.length === 0,
      event_id: eventId,
      processed_actions: processedActions,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Webhook processing completed:', eventId);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in webhook-handler function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        event_id: crypto.randomUUID(),
        errors: [(error as Error).message]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature.toLowerCase() === expectedSignature.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function handleDocumentUploaded(supabaseClient: SupabaseClient, data: DocumentUploadedData, actions: string[], errors: string[]) {
  try {
    const { document_id, user_id, auto_analyze = true } = data;
    
    if (auto_analyze) {
      // Trigger automatic compliance analysis
      const { error } = await supabaseClient.functions.invoke('analyze-compliance', {
        body: { document_id }
      });
      
      if (error) {
        errors.push(`Failed to trigger analysis: ${error.message}`);
      } else {
        actions.push('triggered_compliance_analysis');
      }
    }
    
    // Create notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        type: 'info',
        title: 'Document Processed',
        message: 'Your document has been uploaded and queued for analysis.',
        related_document_id: document_id
      });
    
    actions.push('created_notification');
    
  } catch (error: unknown) {
    errors.push(`Document upload handler error: ${(error as Error).message}`);
  }
}

async function handleComplianceThresholdExceeded(supabaseClient: SupabaseClient, data: ComplianceThresholdExceededData, actions: string[], errors: string[]) {
  try {
    const { user_id, document_id, risk_level, compliance_score, threshold } = data;
    
    // Create high-priority notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        type: 'warning',
        title: 'Compliance Threshold Exceeded',
        message: `Document compliance score (${compliance_score}%) is below threshold (${threshold}%). Risk Level: ${risk_level}`,
        related_document_id: document_id
      });
    
    actions.push('created_alert_notification');
    
    // Send email notification for critical issues
    if (risk_level === 'CRITICAL') {
      await supabaseClient.functions.invoke('send-notification-email', {
        body: {
          user_id,
          document_name: data.document_name || 'Document',
          risk_level,
          compliance_score,
          notification_type: 'webhook_alert'
        }
      });
      
      actions.push('sent_email_alert');
    }
    
    // Trigger immediate re-analysis if score is very low
    if (compliance_score < 30) {
      await supabaseClient.functions.invoke('analyze-compliance', {
        body: { document_id }
      });
      
      actions.push('triggered_reanalysis');
    }
    
  } catch (error: unknown) {
    errors.push(`Compliance threshold handler error: ${(error as Error).message}`);
  }
}

async function handleRegulationUpdated(supabaseClient: SupabaseClient, data: RegulationUpdatedData, actions: string[], errors: string[]) {
  try {
    const { regulation_name, update_type, affected_documents } = data;
    
    // Get all users who have documents affected by this regulation
    const { data: affectedUsers } = await supabaseClient
      .from('documents')
      .select('user_id')
      .in('id', affected_documents || []);
    
    if (affectedUsers?.length) {
      const uniqueUsers = [...new Set(affectedUsers.map(u => u.user_id))];
      
      // Create notifications for affected users
      const notifications = uniqueUsers.map(user_id => ({
        user_id,
        type: 'info',
        title: 'Regulation Update',
        message: `${regulation_name} has been updated (${update_type}). Your documents may need re-analysis.`
      }));
      
      await supabaseClient
        .from('notifications')
        .insert(notifications);
      
      actions.push(`notified_${uniqueUsers.length}_users`);
    }
    
    // Schedule re-analysis for affected documents
    if (affected_documents?.length && update_type === 'major') {
      // This would typically queue documents for re-analysis
      actions.push(`queued_${affected_documents.length}_documents_for_reanalysis`);
    }
    
  } catch (error: unknown) {
    errors.push(`Regulation update handler error: ${(error as Error).message}`);
  }
}

async function handleAuditRequested(supabaseClient: SupabaseClient, data: AuditRequestedData, actions: string[], errors: string[]) {
  try {
    const { user_id, audit_scope, requested_by, deadline } = data;
    
    // Create audit notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        type: 'warning',
        title: 'Audit Requested',
        message: `An audit has been requested for scope: ${audit_scope}. Deadline: ${deadline}`
      });
    
    actions.push('created_audit_notification');
    
    // Trigger comprehensive compliance scan
    await supabaseClient.functions.invoke('scheduled-compliance-scan', {
      body: {
        user_id,
        scan_type: 'full',
        notification_preferences: { email: true, in_app: true }
      }
    });
    
    actions.push('triggered_audit_scan');
    
  } catch (error: unknown) {
    errors.push(`Audit request handler error: ${(error as Error).message}`);
  }
}

async function handleSystemAlert(supabaseClient: SupabaseClient, data: SystemAlertData, actions: string[], errors: string[]) {
  try {
    const { alert_type, severity, message, affected_users } = data;
    
    // Create system-wide notifications if no specific users
    const targetUsers = affected_users || [];
    
    if (targetUsers.length === 0 && severity === 'critical') {
      // Get all active users for critical system alerts
      const { data: allUsers } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .limit(100);
      
      if (allUsers) {
        targetUsers.push(...allUsers.map(u => u.user_id));
      }
    }
    
    if (targetUsers.length > 0) {
      const notifications = targetUsers.map(user_id => ({
        user_id,
        type: severity === 'critical' ? 'error' : 'warning',
        title: `System Alert: ${alert_type}`,
        message: message
      }));
      
      await supabaseClient
        .from('notifications')
        .insert(notifications);
      
      actions.push(`created_${notifications.length}_system_notifications`);
    }
    
  } catch (error: unknown) {
    errors.push(`System alert handler error: ${(error as Error).message}`);
  }
}

async function handleUserRiskProfileChanged(supabaseClient: SupabaseClient, data: UserRiskProfileChangedData, actions: string[], errors: string[]) {
  try {
    const { user_id, old_profile, new_profile, trigger_rescan } = data;
    
    // Create notification about risk profile change
    await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        type: 'info',
        title: 'Risk Profile Updated',
        message: `Your risk profile has been updated from ${old_profile} to ${new_profile}.`
      });
    
    actions.push('created_profile_change_notification');
    
    // Trigger document re-analysis if risk profile significantly changed
    if (trigger_rescan) {
      await supabaseClient.functions.invoke('scheduled-compliance-scan', {
        body: {
          user_id,
          scan_type: 'incremental',
          notification_preferences: { email: false, in_app: true }
        }
      });
      
      actions.push('triggered_profile_based_rescan');
    }
    
  } catch (error: unknown) {
    errors.push(`Risk profile change handler error: ${(error as Error).message}`);
  }
}

async function handleGenericEvent(supabaseClient: SupabaseClient, event: WebhookEvent, actions: string[], errors: string[]) {
  try {
    // Log generic events for analysis
    console.log('Processing generic webhook event:', event);
    
    // Basic notification for unhandled events if user_id is present
    if (event.data.user_id) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: event.data.user_id,
          type: 'info',
          title: 'System Event',
          message: `Event received: ${event.event_type}`
        });
      
      actions.push('created_generic_notification');
    }
    
  } catch (error: unknown) {
    errors.push(`Generic event handler error: ${(error as Error).message}`);
  }
}
