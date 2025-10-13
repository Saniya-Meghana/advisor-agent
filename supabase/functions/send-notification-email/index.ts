import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  document_name: string;
  risk_level: string;
  compliance_score: number;
  notification_type?: 'analysis_complete' | 'scheduled_scan' | 'webhook_alert';
  additional_data?: Record<string, unknown>;
}

interface EmailResponse {
  id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { 
      user_id, 
      document_name, 
      risk_level, 
      compliance_score,
      notification_type = 'analysis_complete',
      additional_data 
    }: NotificationRequest = await req.json();

    // Check user notification preferences
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('email_alerts')
      .eq('user_id', user_id)
      .maybeSingle();

    if (settings && !settings.email_alerts) {
      console.log('Email alerts disabled for user:', user_id);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email alerts disabled' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile not found');
    }

    const subject = getEmailSubject(notification_type, risk_level, document_name);
    const htmlContent = generateEmailHTML({
      user_name: profile.full_name || 'User',
      document_name,
      risk_level,
      compliance_score,
      notification_type,
      additional_data
    });

    // Retry logic with exponential backoff
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: emailResponse, error: emailError } = await resend.emails.send({
          from: "Compliance Assistant <onboarding@resend.dev>",
          to: [profile.email],
          subject,
          html: htmlContent,
        });

        if (emailError) {
          throw new Error(`Resend error: ${emailError.message}`);
        }

        console.log("Email sent successfully:", emailResponse);

        // Create in-app notification
        await supabaseClient.from('notifications').insert({
          user_id,
          title: subject,
          message: `Compliance analysis complete for ${document_name}`,
          type: risk_level === 'CRITICAL' || risk_level === 'HIGH' ? 'error' : 'success',
          metadata: { 
            ...additional_data, 
            email_id: (emailResponse as EmailResponse)?.id,
            channel: 'email',
            risk_level,
            compliance_score
          }
        });

        // Log audit event
        await supabaseClient.functions.invoke('log-audit-event', {
          body: {
            user_id,
            action: 'email_notification_sent',
            resource_type: 'notification',
            details: {
              notification_type,
              document_name,
              risk_level,
              email_id: (emailResponse as EmailResponse)?.id
            }
          }
        });

        return new Response(JSON.stringify({ 
          success: true,
          email_id: (emailResponse as EmailResponse)?.id
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });

      } catch (error) {
        console.error(`Email send attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed after ${maxRetries} attempts: ${(lastError as Error).message}`);

  } catch (error: unknown) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW': return '#10B981';
    case 'MEDIUM': return '#F59E0B';
    case 'HIGH': return '#F97316';
    case 'CRITICAL': return '#EF4444';
    default: return '#6B7280';
  }
}

function getEmailSubject(type: string, riskLevel: string, documentName: string): string {
  switch (type) {
    case 'analysis_complete':
      return `🔍 Compliance Analysis Complete - ${riskLevel} Risk Detected`;
    case 'scheduled_scan':
      return `📊 Scheduled Compliance Scan Results - ${documentName}`;
    case 'webhook_alert':
      return `⚠️ Compliance Alert - Immediate Attention Required`;
    default:
      return `📋 Compliance Notification - ${documentName}`;
  }
}

function generateEmailHTML(data: {
  user_name: string;
  document_name: string;
  risk_level: string;
  compliance_score: number;
  notification_type: string;
  additional_data?: Record<string, unknown>;
}): string {
  const riskColor = getRiskColor(data.risk_level);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .risk-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .score-circle { width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; margin: 16px 0; }
    .cta-button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; margin: 16px 0; }
    .footer { background-color: #f1f5f9; padding: 24px; text-align: center; color: #64748b; font-size: 14px; }
    .divider { height: 1px; background-color: #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🛡️ Compliance Analysis</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Risk & Compliance Management System</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1e293b; margin-bottom: 16px;">Hello ${data.user_name},</h2>
      
      <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
        We've completed the compliance analysis for your document: <strong>${data.document_name}</strong>
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <span class="risk-badge" style="background-color: ${riskColor}; color: white;">
              ${data.risk_level} RISK
            </span>
          </div>
          <div class="score-circle" style="background-color: ${riskColor};">
            ${data.compliance_score}%
          </div>
        </div>
        
        <div class="divider"></div>
        
        <h3 style="color: #1e293b; margin-bottom: 12px;">Analysis Summary</h3>
        <ul style="color: #475569; line-height: 1.6;">
          <li>Compliance Score: <strong>${data.compliance_score}%</strong></li>
          <li>Risk Level: <strong>${data.risk_level}</strong></li>
          <li>Document: <strong>${data.document_name}</strong></li>
          <li>Analysis Date: <strong>${new Date().toLocaleDateString()}</strong></li>
        </ul>
      </div>
      
      ${data.risk_level === 'HIGH' || data.risk_level === 'CRITICAL' ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <h4 style="color: #dc2626; margin: 0 0 8px 0;">⚠️ Immediate Action Required</h4>
        <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
          This document has been flagged with ${data.risk_level.toLowerCase()} risk. Please review the detailed analysis and take appropriate action.
        </p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app') || '#'}" class="cta-button">
          View Detailed Report
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
        Need help? Our compliance experts are here to assist you with any questions or concerns about your analysis results.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">This is an automated message from your Risk & Compliance Management System.</p>
      <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} Compliance Management. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(handler);
