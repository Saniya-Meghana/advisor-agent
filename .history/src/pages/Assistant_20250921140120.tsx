import { useState } from "react";
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";

const Assistant = () => {
  const [sessions, setSessions] = useState([
    { id: 1, title: "Advice regarding stocks", date: "11/09/2025" },
    { id: 2, title: "New Chat Session", date: "09/09/2025" },
    { id: 3, title: "New Chat Session", date: "09/09/2025" },
    { id: 4, title: "New Chat Session", date: "09/09/2025" },
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Chat Sessions */}
      <aside className="w-72 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">Chat Sessions</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setSessions([...sessions, { id: Date.now(), title: "New Chat", date: new Date().toLocaleDateString() }])
            }
          >
            <PlusCircle className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="p-2 rounded-md cursor-pointer hover:bg-muted"
              >
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.date}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Risk & Compliance Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Your AI assistant for AML, KYC, SOX, and GDPR compliance.
          </p>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <Card className="mb-4 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Hello! I can help you analyze documents, assess risks, and answer compliance questions.
            </CardContent>
          </Card>

          {/* 👇 Inject actual chat component */}
          <EnhancedComplianceChat />
        </div>
      </main>
    </div>
  );
};

export default Assistant;
