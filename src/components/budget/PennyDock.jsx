import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Maximize2, Minimize2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PennyCharacter from '@/components/penny/PennyCharacter';
import PennyMessages from './PennyMessages';

const GREETING = { role: 'assistant', content: "Hi! I'm Penny, your budget coach 💚 Ask me anything — like *\"how much did we spend on clothing in October?\"* or *\"compare dining out over the last few months\"* — and I'll bring it up on screen for you. I can also make changes for you — try *\"Cap dining at ₪1,500\"* or *\"Add my US rent, $2,000 a month\"*." };

// Keep the conversation alive as the user moves between pages
let savedMessages = null;

export default function PennyDock({ onUiAction }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('bubble'); // bubble | panel | full
  const [messages, setMessages] = useState(savedMessages || [GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Restore the saved conversation once per session
  useEffect(() => {
    if (savedMessages) return;
    base44.entities.PennyMessage.list('created_date', 300).then(rows => {
      if (rows.length) setMessages([GREETING, ...rows.map(r => ({ role: r.role, content: r.content, chart: r.chart || null }))]);
    });
  }, []);

  useEffect(() => { savedMessages = messages; }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setSending(true);
    base44.entities.PennyMessage.create({ role: 'user', content: text });
    try {
      const res = await base44.functions.invoke('budgetCoach', { messages: next.slice(-14) });
      setMessages([...next, { role: 'assistant', content: res.data.reply, chart: res.data.chart || null }]);
      const rec = { role: 'assistant', content: res.data.reply };
      if (res.data.chart) rec.chart = res.data.chart;
      base44.entities.PennyMessage.create(rec);
      if (res.data.action_result) queryClient.invalidateQueries();
      if (res.data.ui_action) {
        if (mode === 'full') setMode('panel');
        if (onUiAction) onUiAction(res.data.ui_action);
      }
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: "Sorry, I hit a snag — please try again 🙏" }]);
    }
    setSending(false);
  };

  if (mode === 'bubble') {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <PennyCharacter size={72} animation="meditating" onClick={() => setMode('panel')} />
      </div>
    );
  }

  const isFull = mode === 'full';
  return (
    <div className={isFull
      ? 'fixed inset-2 md:inset-8 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100'
      : 'fixed bottom-5 right-5 z-50 flex flex-col w-[92vw] max-w-sm h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100'}>
      <div className="flex items-center gap-2 p-3 border-b border-slate-100">
        <PennyCharacter size={isFull ? 56 : 36} animation={sending ? 'working' : 'meditating'} isThinking={sending} />
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Penny</p>
          <p className="text-xs text-slate-400">{isFull ? 'Strategy mode — big-picture conversation' : 'Guide mode — I can point at your dashboard'}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setMode(isFull ? 'panel' : 'full')} title={isFull ? 'Shrink to guide mode' : 'Expand to strategy mode'}>
          {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setMode('bubble')}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <PennyMessages messages={messages} sending={sending} />
      <div className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Penny about your budget..."
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}