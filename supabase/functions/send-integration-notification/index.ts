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

    const { user_id, report_data } = await req.json();

    console.log('Sending integration notifications for user:', user_id);

    // Get user's integration settings
    const { data: integrations, error: intError } = await supabaseClient
      .from('integration_settings')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_enabled', true);

    if (intError) {
      console.error('Failed to fetch integrations:', intError);
      return new Response(JSON.stringify({ error: 'Failed to fetch integrations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const integration of integrations || []) {
      const rules = integration.notification_rules;
      const score = report_data.compliance_score;
      const riskLevel = report_data.risk_level.toLowerCase();

      // Check if notification should be sent based on rules
      const shouldNotify =
        (riskLevel === 'critical' && rules.on_critical) ||
        (riskLevel === 'high' && rules.on_high) ||
        (riskLevel === 'medium' && rules.on_medium) ||
        (riskLevel === 'low' && rules.on_low) ||
        score <= rules.min_score;

      if (!shouldNotify) {
        console.log(`Skipping ${integration.integration_type} - doesn't meet notification criteria`);
        continue;
      }

      // Format message based on integration type
      let payload;
      if (integration.integration_type === 'slack') {
        payload = {
          text: `🚨 Compliance Alert`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${riskLevel.toUpperCase()} Risk Detected`
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Compliance Score:*\n${score}/100`
                },
                {
                  type: "mrkdwn",
                  text: `*Risk Level:*\n${riskLevel}`
                },
                {
                  type: "mrkdwn",
                  text: `*Issues Found:*\n${report_data.issues_detected.length}`
                },
                {
                  type: "mrkdwn",
                  text: `*Document:*\n${report_data.document_name || 'N/A'}`
                }
              ]
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Summary:*\n${report_data.analysis_summary?.slice(0, 200)}...`
              }
            }
          ]
        };
      } else if (integration.integration_type === 'teams') {
        payload = {
          "@type": "MessageCard",
          "@context": "https://schema.org/extensions",
          "summary": `Compliance Alert: ${riskLevel} Risk`,
          "themeColor": riskLevel === 'critical' ? 'FF0000' : riskLevel === 'high' ? 'FFA500' : 'FFFF00',
          "title": `🚨 ${riskLevel.toUpperCase()} Risk Detected`,
          "sections": [
            {
              "facts": [
                { "name": "Compliance Score", "value": `${score}/100` },
                { "name": "Risk Level", "value": riskLevel },
                { "name": "Issues Found", "value": report_data.issues_detected.length.toString() },
                { "name": "Document", "value": report_data.document_name || 'N/A' }
              ]
            },
            {
              "text": report_data.analysis_summary?.slice(0, 200) + '...'
            }
          ]
        };
      }

      // Send notification
      try {
        const notificationResponse = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        results.push({
          integration_type: integration.integration_type,
          success: notificationResponse.ok,
          status: notificationResponse.status,
        });

        console.log(`Sent ${integration.integration_type} notification: ${notificationResponse.status}`);
      } catch (error) {
        console.error(`Failed to send ${integration.integration_type} notification:`, error);
        results.push({
          integration_type: integration.integration_type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: results.filter(r => r.success).length, results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-integration-notification function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Notification failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
