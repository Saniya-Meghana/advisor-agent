import { useState, useEffect } from "react";
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, Edit2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Session {
  id: number;
  title: string;
  date: string;
  messages: Message[];
}

const Assistant = () => {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem("chatSessions");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const addSession = () => {
    const newSession: Session = {
      id: Date.now(),
      title: "New Chat",
      date: new Date().toLocaleDateString(),
      messages: [
        {
          role: "assistant",
          content: "Hello! I'm your Risk & Compliance Advisor. How can I assist you today?",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // ✅ Replace all sessions with just the new one
    setSessions([newSession]);
    setActiveSessionId(newSession.id);
    localStorage.setItem("chatSessions", JSON.stringify([newSession]));
  };

  const deleteSession = (id: number) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length ? updated[0].id : null);
    }
  };

  const renameSession = (id: number) => {
    const newTitle = prompt("Enter new session title:");
    if (newTitle) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
      );
    }
  };

  const handleSendMessage = (content: string) => {
    if (!activeSession) return;

    const userMsg: Message = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const aiMsg: Message = {
      role: "assistant",
      content: `Received your message: "${content}". Here's compliance advice...`,
      timestamp: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, messages: [...s.messages, userMsg, aiMsg] }
          : s
      )
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">Chat Sessions</h2>
          <Button size="sm" variant="outline" onClick={addSession}>
            <PlusCircle className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`p-2 rounded-md cursor-pointer flex justify-between items-center hover:bg-muted ${
                  s.id === activeSessionId ? "bg-muted" : ""
                }`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.date}</p>
                </div>
                <div className="flex space-x-2">
                  <Edit2
                    className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameSession(s.id);
                    }}
                  />
                  <Trash2
                    className="w-4 h-4 cursor-pointer text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Risk & Compliance Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Your AI assistant for AML, KYC, SOX, and GDPR compliance.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {!activeSession ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>No Active Session</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Please select or create a chat session to start.
              </CardContent>
            </Card>
          ) : (
            <EnhancedComplianceChat
              session={activeSession}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Assistant;
