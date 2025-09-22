import * as React from "react";
import MessageBubble, { type Message } from "./MessageBubble";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const initialAssistant: Message = {
  id: "m0",
  role: "assistant",
  content:
    "Hi there! I’m your Risk & Compliance Advisor. I’ll base answers on the documents we retrieve. If the context is missing, I’ll explain what’s unclear and suggest where to check next. How can I help today?",
  sources: [
    { title: "No documents connected yet" },
  ],
};

function safeAssistantReply(userText: string): Message {
  const lower = userText.toLowerCase();
  let hint = "";
  if (lower.includes("aml") || lower.includes("kyc")) hint = "AML/KYC";
  if (lower.includes("gdpr")) hint = "GDPR";
  if (lower.includes("sox")) hint = "SOX";

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      `That’s a thoughtful question. I don’t have your source documents yet, so I can’t confirm specifics. Here’s a safe next step:\n\n` +
      `1) Identify the exact policy or regulation (e.g., ${hint || "AML, KYC, SOX, GDPR"}).\n` +
      `2) Pull the relevant section/paragraph.\n` +
      `3) Check if any thresholds, definitions, or exemptions apply.\n\n` +
      `If you’d like, I can outline a checklist and where to look (articles/sections) once documents are connected.`,
    sources: [{ title: "Context not retrieved yet" }],
  };
}

const ComplianceChat = () => {
  const [messages, setMessages] = React.useState<Message[]>([initialAssistant]);
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const assistant = safeAssistantReply(trimmed);
    setMessages((prev) => [...prev, userMsg, assistant]);
    setInput("");
  };

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <section id="chat" aria-label="Compliance chat" className="mt-10">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-xl">Chat with your advisor</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div
            ref={listRef}
            className="h-[360px] w-full overflow-y-auto rounded-md border p-4 bg-background/60"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div key={m.id} className="mb-4">
                <MessageBubble message={m} />
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <Input
              placeholder="Ask about AML, KYC, SOX, GDPR…"
              aria-label="Your message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit" variant="hero" className="shrink-0">
              Send
            </Button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            Accuracy first: answers rely on retrieved policy text. If uncertain, I’ll say so and suggest where to check.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

export default ComplianceChat;
