'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types';
import { sendChatMessage } from '@/lib/ai-actions';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm your Ayende AI assistant with full context of your business finances.\n\nYou can ask me about your revenue, expenses, and net income, how to classify specific transactions, tax code guidance for Canadian and US businesses, journal entry questions, and any general bookkeeping questions.\n\nHow can I help you today?",
};

const SUGGESTED_PROMPTS = [
  'What was my net income this year?',
  'How do I classify an owner draw?',
  'What is HST and when do I charge it?',
  'Explain my current trial balance',
];

function MarkdownMessage({ content, dark }: { content: string; dark?: boolean }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => <p className="font-semibold text-base mb-1">{children}</p>,
        h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
        h3: ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
        ul: ({ children }) => <ul className="mb-1.5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1.5 space-y-1">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2">
            <span className="flex-shrink-0 mt-0.5">•</span>
            <span>{children}</span>
          </li>
        ),
        hr: () => <div className={cn('my-3 border-t', dark ? 'border-white/20' : 'border-gray-200')} />,
        code: ({ children }) => (
          <code className={cn('rounded px-1.5 py-0.5 text-xs font-mono', dark ? 'bg-white/20' : 'bg-gray-100')}>
            {children}
          </code>
        ),
        blockquote: ({ children }) => (
          <blockquote className={cn('border-l-2 pl-3 my-1.5 opacity-80', dark ? 'border-white/40' : 'border-gray-300')}>
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { role: 'user', content };
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

  const isWelcomeOnly = messages.length === 1;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0F6E56]" />
            AI Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ask questions about your business finances in plain English
          </p>
        </div>
        {!isWelcomeOnly && (
          <button
            onClick={() => { setMessages([WELCOME_MESSAGE]); setError(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear chat
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4 flex-shrink-0">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          AI responses are for guidance only and do not constitute professional accounting or tax advice. Always verify with a qualified accountant.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#0F6E56] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[#0F6E56] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm',
              )}
            >
              {msg.role === 'assistant' ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#0F6E56] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {isWelcomeOnly && !loading && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="py-4 flex-shrink-0">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm focus-within:border-[#0F6E56] transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your books…"
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
            disabled={loading}
            autoFocus
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-[#0F6E56] hover:bg-[#0a5a45] disabled:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
