import { useState, useEffect } from "react";
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2 } from "lucide-react";

const Assistant = () => {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("chatSessions");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(sessions));
  }, [sessions]);

  const handleNewSession = () => {
    const today = new Date().toLocaleDateString();
    const baseTitle = "New Chat";
    const count = sessions.filter(s => s.title.startsWith(baseTitle)).length;

    const newSession = {
      id: Date.now(),
      title: count === 0 ? baseTitle : `${baseTitle} ${count + 1}`,
      date: today,
      messages: [],
    };

    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: number) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length ? updated[0].id : null);
    }
  };

  const handleRenameSession = (id: number) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, title: editedTitle } : s))
    );
    setEditingSessionId(null);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">Chat Sessions</h2>
          <Button size="sm" variant="outline" onClick={handleNewSession}>
            <PlusCircle className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-2">
            {sessions.map(s => (
              <li
                key={s.id}
                className={`p-2 rounded-md cursor-pointer hover:bg-muted ${
                  s.id === activeSessionId ? "bg-muted" : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <div
                    className="flex-1"
                    onClick={() => setActiveSessionId(s.id)}
                    onDoubleClick={() => {
                      setEditingSessionId(s.id);
                      setEditedTitle(s.title);
                    }}
                  >
                    {editingSessionId === s.id ? (
                      <input
                        value={editedTitle}
                        onChange={e => setEditedTitle(e.target.value)}
                        onBlur={() => handleRenameSession(s.id)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRenameSession(s.id);
                        }}
                        className="text-sm font-medium w-full bg-transparent border-b border-muted-foreground focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Risk & Compliance Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Your AI assistant for AML, KYC, SOX, and GDPR compliance.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <Card className="mb-4 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Hello! I can help you analyze documents, assess risks, and answer compliance questions.
            </CardContent>
          </Card>

          {activeSession ? (
            <EnhancedComplianceChat sessionId={activeSession.id} />
          ) : (
            <p className="text-muted-foreground">Select or create a session to begin.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Assistant;
