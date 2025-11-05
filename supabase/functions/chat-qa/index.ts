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

    const { messages, session_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    console.log('Processing chat query for user:', user.id);

    // Get last user message
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('Embedding generation failed');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for relevant document chunks using vector similarity
    const { data: relevantChunks, error: searchError } = await supabaseClient.rpc(
      'search_document_embeddings',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
    }

    // Build context from relevant chunks
    let context = '';
    const citations: any[] = [];

    if (relevantChunks && relevantChunks.length > 0) {
      for (const chunk of relevantChunks) {
        // Get document details
        const { data: doc } = await supabaseClient
          .from('documents')
          .select('id, original_name')
          .eq('id', chunk.document_id)
          .eq('user_id', user.id)
          .single();

        if (doc) {
          context += `\n\n[Document: ${doc.original_name}]\n${chunk.chunk_text}`;
          citations.push({
            document_id: doc.id,
            document_name: doc.original_name,
            chunk_index: chunk.chunk_index,
            relevance_score: chunk.similarity,
          });
        }
      }
    }

    // Prepare system message with context
    const systemMessage = {
      role: 'system',
      content: `You are a compliance and legal document Q&A assistant. Answer questions based on the provided document context. Always cite the document sources in your answers.

Context from user's documents:
${context || 'No relevant documents found.'}

Guidelines:
- Provide accurate, precise answers based on the context
- Always mention which document(s) you're referencing
- If information is not in the context, say so clearly
- For compliance questions, highlight risks and recommendations
- Keep answers concise but comprehensive`
    };

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    // Store the conversation in database
    if (session_id) {
      await supabaseClient.from('chat_messages').insert([
        { session_id, user_id: user.id, message_type: 'user', content: query, metadata: {} },
      ]);
    }

    // Return streaming response with citations in headers
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Citations': JSON.stringify(citations),
      },
    });

  } catch (error) {
    console.error('Error in chat-qa function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chat processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
