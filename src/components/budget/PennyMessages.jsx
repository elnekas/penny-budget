import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';

export default function PennyMessages({ messages, sending }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={m.role === 'user'
            ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-2 text-sm max-w-[85%]'
            : 'bg-slate-100 text-slate-700 rounded-2xl rounded-bl-md px-4 py-2 text-sm max-w-[85%]'}>
            {m.role === 'user'
              ? <p>{m.content}</p>
              : <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{m.content}</ReactMarkdown>}
          </div>
        </div>
      ))}
      {sending && (
        <div className="flex justify-start">
          <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}