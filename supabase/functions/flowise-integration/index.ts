import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowiseRequest {
  session_id?: string;
  message: string;
  context?: {
    document_ids?: string[];
    regulation_templates?: string[];
    user_preferences?: any;
  };
}

interface FlowiseResponse {
  response: string;
  session_id: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    recommendations?: string[];
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

    const { session_id, message, context }: FlowiseRequest = await req.json();
    
    // Get user from session or auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Processing Flowise chat request for user:', user.id);

    // Build context for AI chat
    const chatContext = await buildChatContext(supabaseClient, user.id, context);

    // Get or create chat session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: `Compliance Chat - ${new Date().toLocaleString()}`
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    // Save user message
    await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: message,
        message_type: 'user',
        metadata: { context }
      });

    // Process with Flowise or fallback AI
    const aiResponse = await processWithFlowise(message, chatContext) || 
                      await processWithFallbackAI(message, chatContext);

    // Save AI response
    await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: aiResponse.response,
        message_type: 'assistant',
        metadata: aiResponse.metadata || {}
      });

    console.log('Flowise integration completed successfully');

    return new Response(JSON.stringify({
      ...aiResponse,
      session_id: currentSessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in flowise-integration function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm experiencing technical difficulties. Please try again later or contact support.",
        session_id: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function buildChatContext(supabaseClient: any, userId: string, context?: any) {
  const contextData: any = {
    user_id: userId,
    recent_reports: [],
    active_regulations: [],
    document_summaries: []
  };

  try {
    // Get recent compliance reports
    const { data: reports } = await supabaseClient
      .from('compliance_reports')
      .select(`
        id, compliance_score, risk_level, analysis_summary, generated_at,
        documents!inner(original_name)
      `)
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(5);

    if (reports) {
      contextData.recent_reports = reports.map(r => ({
        document: r.documents.original_name,
        score: r.compliance_score,
        risk: r.risk_level,
        summary: r.analysis_summary,
        date: r.generated_at
      }));
    }

    // Get active regulation templates
    const { data: templates } = await supabaseClient
      .from('regulation_templates')
      .select('name, description')
      .eq('is_active', true)
      .limit(10);

    if (templates) {
      contextData.active_regulations = templates;
    }

    // Get document context if specified
    if (context?.document_ids?.length) {
      const { data: documents } = await supabaseClient
        .from('documents')
        .select('id, original_name, file_type, processing_status')
        .in('id', context.document_ids)
        .eq('user_id', userId);

      if (documents) {
        contextData.document_summaries = documents;
      }
    }

  } catch (error) {
    console.error('Error building chat context:', error);
  }

  return contextData;
}

async function processWithFlowise(message: string, context: any): Promise<FlowiseResponse | null> {
  const flowiseUrl = Deno.env.get('FLOWISE_API_URL');
  const flowiseApiKey = Deno.env.get('FLOWISE_API_KEY');

  if (!flowiseUrl) {
    console.log('Flowise URL not configured, using fallback AI');
    return null;
  }

  try {
    const response = await fetch(`${flowiseUrl}/api/v1/prediction/your-chatflow-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${flowiseApiKey}`
      },
      body: JSON.stringify({
        question: message,
        chatId: context.user_id,
        overrideConfig: {
          systemMessagePrompt: `You are a specialized compliance and risk management assistant. 
          
Current Context:
- Recent Reports: ${JSON.stringify(context.recent_reports)}
- Active Regulations: ${JSON.stringify(context.active_regulations)}
- Documents: ${JSON.stringify(context.document_summaries)}

Your expertise includes:
1. Regulatory compliance (GDPR, SOX, HIPAA, PCI-DSS, etc.)
2. Risk assessment and mitigation
3. Document analysis and recommendations  
4. Compliance best practices
5. Regulatory updates and changes

Always provide:
- Actionable advice
- Specific regulatory references when relevant
- Clear next steps
- Risk-based prioritization

Be professional, accurate, and helpful.`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Flowise API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      response: data.text || data.answer || 'I apologize, but I could not process your request.',
      session_id: context.user_id,
      metadata: {
        confidence: 0.9,
        sources: data.sourceDocuments?.map((doc: any) => doc.metadata?.source) || [],
        recommendations: extractRecommendations(data.text || data.answer)
      }
    };

  } catch (error: any) {
    console.error('Flowise API error:', error);
    return null;
  }
}

async function processWithFallbackAI(message: string, context: any): Promise<FlowiseResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('AI service not available');
  }

  const systemPrompt = `You are a specialized compliance and risk management assistant with deep expertise in regulatory frameworks.

Current User Context:
- Recent Compliance Reports: ${JSON.stringify(context.recent_reports, null, 2)}
- Active Regulations: ${JSON.stringify(context.active_regulations, null, 2)}
- Document Context: ${JSON.stringify(context.document_summaries, null, 2)}

Your capabilities include:
1. Regulatory Compliance Analysis (GDPR, SOX, HIPAA, PCI-DSS, CCPA, etc.)
2. Risk Assessment & Mitigation Strategies
3. Document Review & Recommendations
4. Compliance Program Development
5. Regulatory Change Management
6. Audit Preparation & Response

Guidelines:
- Provide specific, actionable advice
- Reference relevant regulations and standards
- Consider the user's current compliance status
- Prioritize recommendations by risk level
- Offer practical implementation steps
- Stay updated on regulatory changes

Always structure responses with:
1. Direct answer to the question
2. Relevant regulatory context
3. Specific recommendations
4. Next steps or action items
5. Risk considerations`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return {
      response: aiResponse,
      session_id: context.user_id,
      metadata: {
        confidence: 0.85,
        sources: ['OpenAI GPT-4o-mini', 'Regulatory Knowledge Base'],
        recommendations: extractRecommendations(aiResponse)
      }
    };

  } catch (error: any) {
    console.error('Fallback AI error:', error);
    throw error;
  }
}

function extractRecommendations(text: string): string[] {
  // Simple regex to extract recommendation-like sentences
  const recommendations: string[] = [];
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes('recommend') || 
        sentence.toLowerCase().includes('should') || 
        sentence.toLowerCase().includes('consider') ||
        sentence.toLowerCase().includes('implement')) {
      recommendations.push(sentence.trim());
    }
  }
  
  return recommendations.slice(0, 3); // Limit to top 3
}