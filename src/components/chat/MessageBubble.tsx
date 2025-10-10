import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";

export type ChatSource = {
  title: string;
  href?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp?: string;
};

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar>
          <AvatarImage src="/assistant-icon.png" alt="Assistant" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      )}

      <article
        className={cn(
          "prose dark:prose-invert max-w-[85%] rounded-lg border px-4 py-3 text-sm leading-relaxed transition-all duration-300 ease-in-out overflow-y-auto max-h-[600px]",
          isUser ? "bg-secondary text-secondary-foreground" : "card-elevated bg-card"
        )}
        aria-live="polite"
      >
        <span className="block text-xs font-medium text-muted-foreground mb-1">
          {isUser ? "You" : "Assistant"}
        </span>

        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-lg font-semibold mt-4 mb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-base font-semibold mt-4 mb-2 text-primary" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-muted-foreground" {...props} />,
            p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
            a: ({ node, ...props }) => (
              <a {...props} className="text-primary underline hover:text-primary/80" />
            ),
            code: ({ node, ...props }) => (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />
            ),
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
            li: ({ node, ...props }) => <li className="leading-snug" {...props} />,
            hr: () => <hr className="my-4 border-muted" />,
            details: ({ node, ...props }) => (
              <details className="mt-3" {...props} />
            ),
            summary: ({ node, ...props }) => (
              <summary className="cursor-pointer font-semibold text-sm text-primary" {...props} />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>

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
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  🔗 {s.title}
                </Badge>
              </a>
            ))}
          </div>
        )}

        {message.timestamp && (
          <span className="text-xs text-muted-foreground mt-2 block text-right">
            {message.timestamp}
          </span>
        )}
      </article>

      {isUser && (
        <Avatar>
          <AvatarImage src="/user-icon.png" alt="You" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default MessageBubble;
