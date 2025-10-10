import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, FileText, AlertTriangle, MessageSquare, Plus } from 'lucide-react';
import MessageBubble from './MessageBubble';

interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: string;
  content: string;
  metadata: unknown;
  created_at: string;
}

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const EnhancedComplianceChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      
      // Auto-select the most recent session or create one if none exist
      if (data && data.length > 0) {
        setCurrentSession(data[0]);
      } else {
        await createNewSession();
      }
    } catch (params: unknown) {
      console.error('Error fetching sessions:', params);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (params: unknown) {
      console.error('Error fetching messages:', params);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      });
    }
  };

  const createNewSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'New Chat Session'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setSessions(prev => [data, ...prev]);
      setMessages([]);
      
      // Add welcome message
      await addWelcomeMessage(data.id);
    } catch (params: unknown) {
      console.error('Error creating session:', params);
      toast({
        title: "Error",
        description: "Failed to create new chat session",
        variant: "destructive",
      });
    }
  };

  const addWelcomeMessage = async (sessionId: string) => {
    const welcomeMessage = {
      session_id: sessionId,
      user_id: user!.id,
      message_type: 'assistant' as const,
      content: `Hello! I'm your Risk & Compliance Advisor. I can help you with:

• Analyzing compliance documents for regulatory issues
• Identifying risk factors in your uploaded files
• Providing recommendations for compliance improvements
• Answering questions about regulatory requirements
• Interpreting compliance reports and findings

How can I assist you today?`,
      metadata: { type: 'welcome' }
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(welcomeMessage)
        .select()
        .single();

      if (error) throw error;
      setMessages([data]);
    } catch (error) {
      console.error('Error adding welcome message:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession || !user) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Add user message to database
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
          user_id: user.id,
          message_type: 'user',
          content: userMessage,
          metadata: {}
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages(prev => [...prev, userMessageData]);

      // Get AI response
      const { data: aiResponse, error: aiError } = await supabase.functions
        .invoke('compliance-chat', {
          body: {
            message: userMessage,
            session_id: currentSession.id,
            user_id: user.id
          }
        });

      if (aiError) throw aiError;

      // Add AI response to database
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSession.id,
          user_id: user.id,
          message_type: 'assistant',
          content: aiResponse.response,
          metadata: aiResponse.metadata || {}
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages(prev => [...prev, assistantMessageData]);

      // Update session title if it's the first user message
      if (messages.filter(m => m.message_type === 'user').length === 0) {
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
        
        await supabase
          .from('chat_sessions')
          .update({ title })
          .eq('id', currentSession.id);

        setCurrentSession(prev => prev ? { ...prev, title } : null);
        setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, title } : s));
      }

    } catch (params: unknown) {
      console.error('Error sending message:', params);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingSessions) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Session Sidebar */}
      <div className="w-80 border-r bg-muted/20">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Chat Sessions</h3>
            <Button size="sm" variant="outline" onClick={createNewSession}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                  currentSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => setCurrentSession(session)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title || 'New Session'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Risk & Compliance Advisor</h3>
            <Badge variant="outline">AI Assistant</Badge>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.message_type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="flex items-start gap-2">
                    {message.message_type === 'user' ? (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about compliance, regulations, or risk assessment..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedComplianceChat;
