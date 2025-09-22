import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message, session_id, user_id } = await req.json();

    if (!message || !session_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chat message for user: ${user_id}, session: ${session_id}`);

    // Get user's recent documents and compliance reports for context
    const { data: documents } = await supabaseClient
      .from('documents')
      .select('id, original_name, processing_status')
      .eq('user_id', user_id)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: reports } = await supabaseClient
      .from('compliance_reports')
      .select(`
        *,
        documents!inner(original_name)
      `)
      .eq('user_id', user_id)
      .order('generated_at', { ascending: false })
      .limit(3);

    // Get recent conversation history
    const { data: recentMessages } = await supabaseClient
      .from('chat_messages')
      .select('message_type, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for AI
    const context = buildContext(message, documents, reports, recentMessages);

    // Get AI response
    const aiResponse = await getComplianceAdvice(context);

    console.log(`AI response generated for session: ${session_id}`);

    return new Response(
      JSON.stringify({ 
        response: aiResponse.response,
        metadata: aiResponse.metadata
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Compliance chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat message', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildContext(
  message: string, 
  documents: unknown[], 
  reports: unknown[], 
  recentMessages: unknown[]
): string {
  let context = `User Question: ${message}\n\n`;

  // Add document context
  if (documents && documents.length > 0) {
    context += `User's Recent Documents:\n`;
    documents.forEach(doc => {
      context += `- ${doc.original_name} (Status: ${doc.processing_status})\n`;
    });
    context += `\n`;
  }

  // Add compliance report context
  if (reports && reports.length > 0) {
    context += `Recent Compliance Analysis:\n`;
    reports.forEach(report => {
      context += `- Document: ${report.documents.original_name}\n`;
      context += `  Risk Level: ${report.risk_level}\n`;
      context += `  Compliance Score: ${report.compliance_score}%\n`;
      if (report.analysis_summary) {
        context += `  Summary: ${report.analysis_summary.substring(0, 200)}...\n`;
      }
      context += `\n`;
    });
  }

  // Add conversation history
  if (recentMessages && recentMessages.length > 0) {
    context += `Recent Conversation:\n`;
    recentMessages.reverse().forEach(msg => {
      context += `${msg.message_type === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
    });
    context += `\n`;
  }

  return context;
}

async function getComplianceAdvice(context: string): Promise<{
  response: string;
  metadata: unknown;
}> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a Risk & Compliance Advisor AI assistant with expertise in:

1. Regulatory Compliance (GDPR, HIPAA, SOX, PCI DSS, etc.)
2. Risk Assessment and Management
3. Financial Compliance and Reporting
4. Data Privacy and Security
5. Operational Risk Management
6. Legal and Regulatory Requirements

Guidelines for responses:
- Provide accurate, actionable compliance advice
- Reference specific regulations when relevant
- Suggest concrete steps for improvement
- Highlight potential risks and mitigation strategies
- Be professional but approachable
- Ask clarifying questions when needed
- Mention when professional legal advice is recommended
- Use the user's document context when applicable

Always prioritize accuracy and encourage users to consult with compliance professionals for critical decisions.`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Extract potential metadata (like suggested documents to review, etc.)
    const metadata = {
      model_used: 'gpt-4o-mini',
      response_type: 'compliance_advice',
      timestamp: new Date().toISOString()
    };

    return {
      response: aiResponse,
      metadata
    };

  } catch (error) {
    console.error('AI response error:', error);
    
    // Fallback response if AI fails
    return {
      response: `I apologize, but I'm experiencing technical difficulties right now. Here are some general compliance guidance steps you can take:

1. **Document Review**: Ensure all your compliance documents are up-to-date and properly organized
2. **Risk Assessment**: Regularly conduct risk assessments to identify potential compliance gaps
3. **Training**: Keep your team updated on relevant regulatory requirements
4. **Monitoring**: Implement ongoing monitoring processes for compliance metrics
5. **Professional Consultation**: Consider consulting with compliance experts for complex matters

Please try your question again, or contact a compliance professional if you need immediate assistance.`,
      metadata: {
        response_type: 'fallback',
        error: 'ai_service_unavailable'
      }
    };
  }
}