import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ChatSource = {
  title: string;
  href?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
};

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <article
        className={cn(
          "max-w-[85%] rounded-lg border px-4 py-3 text-sm leading-relaxed", 
          isUser ? "bg-secondary text-secondary-foreground" : "card-elevated bg-card"
        )}
        aria-live="polite"
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!!message.sources?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((s, i) => (
              <a
                key={`${message.id}-src-${i}`}
                href={s.href || "#"}
                target={s.href ? "_blank" : undefined}
                rel={s.href ? "noopener noreferrer" : undefined}
                className="focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <Badge variant="secondary" className="cursor-pointer">
                  {s.title}
                </Badge>
              </a>
            ))}
          </div>
        )}
      </article>
    </div>
  );
};

export default MessageBubble;
