"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X, Send, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ASK_PANEL_EVENT = "ask-panel:toggle";

export function openAskPanel() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ASK_PANEL_EVENT));
  }
}

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's Sarah's balance and when's her next session?",
  "Who has overdue invoices?",
  "How much revenue this month?",
  "List sessions this week",
  "How much do I owe Alex this month?",
];

export function AskPanel() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onToggle() {
      setOpen((v) => !v);
    }
    window.addEventListener(ASK_PANEL_EVENT, onToggle);
    return () => window.removeEventListener(ASK_PANEL_EVENT, onToggle);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const next: Message[] = [...messages, { role: "user", content: trimmed }];
      setMessages(next);
      setInput("");
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.text ?? "" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const reset = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col",
            "border-l bg-background shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <DialogPrimitive.Title className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI
            </DialogPrimitive.Title>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={reset}
                  title="Clear conversation"
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about students, tutors, sessions, invoices, or revenue.
                  Answers come straight from your data.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="block w-full rounded-md border bg-card px-3 py-2 text-left text-xs text-foreground hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </div>
                )}
                {error && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask a question…"
                rows={2}
                disabled={loading}
                className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="h-9 w-9"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              AI can make mistakes. Verify numbers before sending to clients.
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "whitespace-pre-wrap bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="space-y-2 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: (props) => <p className="my-1 first:mt-0 last:mb-0" {...props} />,
                ul: (props) => <ul className="my-1 list-disc space-y-0.5 pl-5" {...props} />,
                ol: (props) => <ol className="my-1 list-decimal space-y-0.5 pl-5" {...props} />,
                li: (props) => <li className="leading-snug" {...props} />,
                h1: (props) => <h3 className="mt-2 mb-1 text-base font-semibold" {...props} />,
                h2: (props) => <h3 className="mt-2 mb-1 text-sm font-semibold" {...props} />,
                h3: (props) => <h4 className="mt-2 mb-1 text-sm font-semibold" {...props} />,
                strong: (props) => <strong className="font-semibold" {...props} />,
                table: (props) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="w-full border-collapse text-xs" {...props} />
                  </div>
                ),
                th: (props) => (
                  <th className="border-b px-2 py-1 text-left font-medium" {...props} />
                ),
                td: (props) => <td className="border-b px-2 py-1 align-top" {...props} />,
                pre: (props) => (
                  <pre
                    className="my-2 overflow-x-auto rounded-md bg-background/70 p-2 text-xs"
                    {...props}
                  />
                ),
                a: (props) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  />
                ),
                hr: () => <hr className="my-2 border-border" />,
                blockquote: (props) => (
                  <blockquote
                    className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
                    {...props}
                  />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
