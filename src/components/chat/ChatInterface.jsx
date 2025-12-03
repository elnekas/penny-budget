import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from './MessageBubble';
import VoiceButton from './VoiceButton';
import { cn } from "@/lib/utils";

const quickPrompts = [
  "How much did I spend this month?",
  "Show my spending by category",
  "What's my biggest expense?",
  "Am I on track with my budget?"
];

export default function ChatInterface({ conversationId, onConversationCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages || []);
      });
      return () => unsubscribe();
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async () => {
    const conv = await base44.agents.getConversation(conversationId);
    setConversation(conv);
    setMessages(conv.messages || []);
  };

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'budget_assistant',
      metadata: { name: `Chat ${new Date().toLocaleDateString()}` }
    });
    setConversation(conv);
    onConversationCreated?.(conv.id);
    return conv;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    
    setIsLoading(true);
    setInput('');
    
    let currentConv = conversation;
    if (!currentConv) {
      currentConv = await createNewConversation();
    }

    await base44.agents.addMessage(currentConv, {
      role: 'user',
      content: text
    });
    
    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleVoiceTranscript = (transcript) => {
    sendMessage(transcript);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Hey there! I'm Penny</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Your friendly budget buddy. Tell me what you spent, ask about your finances, or upload a statement!
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm"
                >
                  <Sparkles className="inline h-3 w-3 mr-1.5 text-emerald-500" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-3xl mx-auto">
          <VoiceButton onTranscript={handleVoiceTranscript} disabled={isLoading} />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me about an expense or ask a question..."
            className="flex-1 h-12 rounded-full border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 px-5"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}