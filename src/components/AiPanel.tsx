import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, MessageCircle, Loader2, Minus } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { chat } from '@/ai/aiEngine';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AiPanel() {
  const { aiPanelOpen, toggleAiPanel, aiConfig, setAiConfig, activeProjectId } = useStore();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'Hi! I can plan your day, break down tasks, or summarize progress. Try the quick prompts below.',
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(() => [
    { label: 'Plan', text: 'Plan my next three tasks and suggest priorities based on deadlines.' },
    { label: 'Execute', text: 'Given my current tasks, propose the next actionable step with a 30-minute plan.' },
    { label: 'Soul', text: 'Give me a concise motivation note and a focus mantra.' },
  ], []);

  useEffect(() => {
    if (aiConfig.provider !== 'browser' || aiConfig.model !== 'Xenova/phi-2') {
      setAiConfig({
        provider: 'browser',
        model: 'Xenova/phi-2',
        hfModelId: 'Xenova/phi-2',
        preferApi: false,
        apiKey: undefined,
      });
    }
  }, [aiConfig.provider, aiConfig.model, setAiConfig]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const data = await chat({
        projectId: activeProjectId || 'global',
        message: content,
        skillName: 'chat',
      });
      const contentResp = (data as any)?.message?.content || (data as any)?.response || 'No response received.';
      const botMsg: ChatMessage = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-bot`, role: 'assistant', content: contentResp };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const errorText = e instanceof Error ? e.message : 'unknown runtime error';
      const botMsg: ChatMessage = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-bot`,
        role: 'assistant',
        content: `Model runtime error: ${errorText}`,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
    }
  };

  if (!aiPanelOpen) {
    if (isMobile) {
      return (
        <button
          onClick={toggleAiPanel}
          className="fixed bottom-16 right-4 z-30 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 p-3 active:scale-95"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      );
    }
    return null;
  }

  const width = isMobile ? '100%' : (minimized ? 72 : 320);

  return (
    <AnimatePresence>
      {isMobile && (
        <motion.div
          key="ai-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={toggleAiPanel}
        />
      )}
      <motion.aside
        key="ai-panel"
        initial={{ width: 0, opacity: 0, x: isMobile ? '100%' : 0 }}
        animate={{ width, opacity: 1, x: 0 }}
        exit={{ width: 0, opacity: 0, x: isMobile ? '100%' : 0 }}
        transition={{ duration: 0.25 }}
        className={`h-full border-l border-border bg-surface-elevated flex flex-col shrink-0 overflow-hidden ${isMobile ? 'fixed right-0 top-16 bottom-10 z-40' : ''}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {!minimized && <span className="text-sm font-medium">AI Assistant</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinimized((v) => !v)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title={minimized ? 'Expand' : 'Minimize'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={toggleAiPanel} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            {quickPrompts.map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.text)}
                className="px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                disabled={sending}
              >
                {qp.label}
              </button>
            ))}
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground ml-auto'} max-w-[90%]`}
              >
                {msg.content}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            )}
          </div>
          </div>
        )}

        {!minimized && <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <input
              placeholder="Ask anything…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="p-1 text-muted-foreground disabled:opacity-50"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>}
      </motion.aside>
    </AnimatePresence>
  );
}
