import { useState, useEffect } from "react";
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Download } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Session {
  id: number;
  title: string;
  date: string;
  tag?: string;
  messages: Message[];
}

const Assistant = () => {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem("chatSessions");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const addSession = () => {
    const newSession: Session = {
      id: Date.now(),
      title: "New Chat",
      date: new Date().toLocaleDateString(),
      tag: "",
      messages: [
        {
          role: "assistant",
          content: "Hello! I'm your Risk & Compliance Advisor. How can I assist you today?",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setSessions([newSession]);
    setActiveSessionId(newSession.id);
    localStorage.setItem("chatSessions", JSON.stringify([newSession]));
  };

  const clearAllSessions = () => {
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem("chatSessions");
  };

  const deleteSession = (id: number) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem("chatSessions", JSON.stringify(updated));
    if (activeSessionId === id) {
      setActiveSessionId(updated.length ? updated[0].id : null);
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

  const handleTagChange = (id: number, tag: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, tag } : s))
    );
  };

  const handleExport = () => {
    if (!activeSession) return;
    const blob = new Blob([JSON.stringify(activeSession, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.date.includes(searchTerm)
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-sm">Chat Sessions</h2>
            <Button size="sm" variant="outline" onClick={addSession}>
              <PlusCircle className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          <Input
            placeholder="Search by title or date"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" variant="destructive" onClick={clearAllSessions}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-2">
            {filteredSessions.map((s) => {
              const lastMsg = s.messages[s.messages.length - 1]?.content || "";
              return (
                <li
                  key={s.id}
                  className={`p-2 rounded-md cursor-pointer flex flex-col gap-1 hover:bg-muted ${
                    s.id === activeSessionId ? "bg-muted" : ""
                  }`}
                  onClick={() => setActiveSessionId(s.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.date}</p>
                    </div>
                    <Trash2
                      className="w-4 h-4 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                    />
                  </div>
                  <Input
                    placeholder="Tag (e.g. AML Audit)"
                    value={s.tag || ""}
                    onChange={(e) => handleTagChange(s.id, e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-xs text-muted-foreground truncate italic">
                    {lastMsg}
                  </p>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">Risk & Compliance Advisor</h1>
            <p className="text-sm text-muted-foreground">
              Your AI assistant for AML, KYC, SOX, and GDPR compliance.
            </p>
          </div>
          {activeSession && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {!activeSession ? (
            <Card className="shadow-sm border-dashed border-muted">
              <CardHeader>
                <CardTitle>No Active Session</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground text-center">
                Select a session or start a new one to begin your compliance journey.
              </CardContent>
            </Card>
          ) : (
            <EnhancedComplianceChat />
          )}
        </div>
      </main>
    </div>
  );
};

export default Assistant;
