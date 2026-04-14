'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Send, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types';
import { sendChatMessage } from '@/lib/ai-actions';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm your Tempo AI assistant. Ask me anything about your books â€” transactions, reports, tax codes, or general accounting questions.",
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p:          ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
        em:         ({ children }) => <em className="italic">{children}</em>,
        h1:         ({ children }) => <p className="font-semibold mb-1">{children}</p>,
        h2:         ({ children }) => <p className="font-semibold mb-1">{children}</p>,
        h3:         ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
        ul:         ({ children }) => <ul className="mb-1 space-y-0.5">{children}</ul>,
        ol:         ({ children }) => <ol className="mb-1 space-y-0.5">{children}</ol>,
        li:         ({ children }) => (
          <li className="flex gap-1.5">
            <span className="flex-shrink-0 mt-0.5">â€¢</span>
            <span>{children}</span>
          </li>
        ),
        hr:         () => <div className="my-2 border-t border-current opacity-20" />,
        code:       ({ children }) => <code className="bg-black/10 rounded px-1 text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-current opacity-70 pl-2 my-1">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AiChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const result = await sendChatMessage(updatedMessages);
      if (!result.success) throw new Error(result.error ?? 'Something went wrong.');
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply! }]);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-20 right-4 sm:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
          open ? 'bg-gray-700 hover:bg-gray-800' : 'bg-[#0F6E56] hover:bg-[#0a5a45]',
        )}
        aria-label="Toggle AI Assistant"
      >
        {open
          ? <ChevronDown className="w-5 h-5 text-white" />
          : <Sparkles    className="w-5 h-5 text-white" />
        }
      </button>

      {open && (
        <div className={cn(
          'fixed bottom-24 right-4 sm:right-6 z-50',
          'w-[calc(100vw-2rem)] sm:w-[380px]',
          'h-[480px] sm:h-[520px]',
          'rounded-xl border flex flex-col overflow-hidden bg-white dark:bg-[#242220] border-[#e5e1d8] dark:border-[#3a3730]',
        )}>
          <div className="flex items-center justify-between px-4 py-3 bg-[#0F6E56] text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Tempo AI</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setMessages([WELCOME_MESSAGE]); setError(null); }}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#0F6E56] text-white rounded-br-sm'
                    : 'rounded-bl-sm bg-[#f0ede8] dark:bg-[#2e2c28] text-[#1a1814] dark:text-[#f0ede8]',
                )}>
                  {msg.role === 'assistant'
                    ? <MarkdownMessage content={msg.content} />
                    : msg.content
                  }
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground">Thinkingâ€¦</span>
                </div>
              </div>
            )}
            {error && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border focus-within:border-[#0F6E56] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your booksâ€¦"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="text-[#0F6E56] hover:text-[#0a5a45] disabled:text-muted-foreground transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              AI suggestions are for guidance only â€” always verify
            </p>
          </div>
        </div>
      )}
    </>
  );
}
