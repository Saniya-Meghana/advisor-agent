// @deno-types="https://esm.sh/@supabase/supabase-js@2.7.1/dist/supabase.d.ts"
import { createClient } from "@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // DELETE: allow clearing all sessions/messages for a user or a specific session
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const { user_id, session_id } = body;

      if (!user_id && !session_id) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or session_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session_id) {
        // delete specific session and its messages
        await supabaseClient.from("chat_messages").delete().eq("session_id", session_id);
        await supabaseClient.from("chat_sessions").delete().eq("id", session_id);
      }

      if (user_id) {
        // delete all sessions/messages for the user
        await supabaseClient.from("chat_messages").delete().eq("user_id", user_id);
        await supabaseClient.from("chat_sessions").delete().eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Deletion completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: existing chat processing (including reset flag)
    const { message, session_id, user_id, reset } = await req.json().catch(() => ({}));

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear all sessions/messages if reset is requested
    if (reset === true) {
      await supabaseClient.from("chat_sessions").delete().eq("user_id", user_id);
      await supabaseClient.from("chat_messages").delete().eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true, message: "All sessions cleared" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || !session_id) {
      return new Response(
        JSON.stringify({ error: "Missing message or session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing message for user: ${user_id}, session: ${session_id}`);

    const { data: documents } = await supabaseClient
      .from("documents")
      .select("id, original_name, processing_status")
      .eq("user_id", user_id)
      .eq("processing_status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: reports } = await supabaseClient
      .from("compliance_reports")
      .select("*, documents!inner(original_name)")
      .eq("user_id", user_id)
      .order("generated_at", { ascending: false })
      .limit(3);

    const { data: recentMessages } = await supabaseClient
      .from("chat_messages")
      .select("message_type, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const context = buildContext(message, documents, reports, recentMessages);
    const aiResponse = await getComplianceAdvice(context);

    return new Response(
      JSON.stringify({
        response: aiResponse.response,
        metadata: aiResponse.metadata,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildContext(
  message: string,
  documents: any[] = [],
  reports: any[] = [],
  recentMessages: any[] = []
): string {
  let context = `User Question: ${message}\n\n`;

  if (documents?.length) {
    context += `Recent Documents:\n`;
    for (const doc of documents) {
      context += `- ${doc.original_name} (Status: ${doc.processing_status})\n`;
    }
    context += `\n`;
  }

  if (reports?.length) {
    context += `Compliance Reports:\n`;
    for (const report of reports) {
      context += `- Document: ${report.documents?.original_name}\n`;
      context += `  Risk Level: ${report.risk_level}\n`;
      context += `  Compliance Score: ${report.compliance_score}%\n`;
      if (report.analysis_summary) {
        context += `  Summary: ${String(report.analysis_summary).slice(0, 200)}...\n`;
      }
      context += `\n`;
    }
  }

  if (recentMessages?.length) {
    context += `Conversation History:\n`;
    for (const msg of recentMessages.reverse()) {
      const content = String(msg.content ?? "").slice(0, 150);
      context += `${msg.message_type === "user" ? "User" : "Assistant"}: ${content}${String(msg.content ?? "").length > 150 ? "..." : ""}\n`;
    }
    context += `\n`;
  }

  return context;
}

async function getComplianceAdvice(context: string): Promise<{
  response: string;
  metadata: any;
}> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) throw new Error("Missing OpenAI API key");

  const systemPrompt = `You are a Risk & Compliance Advisor AI assistant with expertise in:
1. Regulatory Compliance (GDPR, HIPAA, SOX, PCI DSS, etc.)
2. Risk Assessment and Management
3. Financial Compliance and Reporting
4. Data Privacy and Security
5. Operational Risk Management
6. Legal and Regulatory Requirements

Guidelines:
- Provide accurate, actionable advice
- Reference specific regulations
- Suggest concrete steps
- Highlight risks and mitigation
- Be professional but approachable
- Ask clarifying questions
- Recommend consulting professionals when needed`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`);

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? "";

    return {
      response: aiResponse,
      metadata: {
        model_used: "gpt-4o-mini",
        response_type: "compliance_advice",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("OpenAI fallback:", error);
    return {
      response: `I'm currently unable to generate a detailed response. Here are general compliance steps:
1. Review documents
2. Conduct risk assessments
3. Train your team
4. Monitor compliance metrics
5. Consult professionals`,
      metadata: {
        response_type: "fallback",
        error: "ai_service_unavailable",
      },
    };
  }
}
