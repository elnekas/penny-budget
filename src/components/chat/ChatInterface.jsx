import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import VoiceButton from './VoiceButton';

const quickPrompts = [
  "I spent $25 on lunch today",
  "Set my food budget to $500",
  "How much did I spend this week?",
  "Import: Coffee $5, Uber $12, Groceries $45"
];

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await base44.functions.invoke('chat', {
        message: text,
        conversationHistory: messages.slice(-10)
      });

      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.message,
        actions: response.data.actions 
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Refresh data if actions were performed
      if (response.data.actions?.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      }
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I had trouble processing that. Please try again! 😅" 
      }]);
    }

    setLoading(false);
  };

  const handleVoiceResult = (transcript) => {
    if (transcript) {
      sendMessage(transcript);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl">💰</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Hey! I'm Penny</h2>
            <p className="text-slate-500 mb-6 max-w-sm">
              Your personal budget buddy. Tell me about your spending, set budgets, or import transactions!
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.role === 'user'
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-slate-100 text-slate-800"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.actions?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20">
                      {msg.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs opacity-80">
                          <Sparkles className="w-3 h-3" />
                          {action.success ? '✓' : '✗'} {action.type.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <VoiceButton onResult={handleVoiceResult} />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Tell Penny about your spending..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}