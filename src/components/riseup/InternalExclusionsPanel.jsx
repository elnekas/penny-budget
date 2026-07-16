import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { fmt } from './riseupGroups';

export default function InternalExclusionsPanel({ transactions, included, onToggle, contextLabel }) {
  const [open, setOpen] = useState(null);

  const groups = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.name]) map[t.name] = { name: t.name, count: 0, total: 0, txs: [] };
      map[t.name].count += 1;
      map[t.name].total += t.amt;
      map[t.name].txs.push(t);
    });
    Object.values(map).forEach(g => g.txs.sort((a, b) => new Date(b.td) - new Date(a.td)));
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const grandTotal = groups.reduce((s, g) => s + (included.includes(g.name) ? 0 : g.total), 0);

  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="font-semibold text-slate-800 text-sm">Hidden card settlements & transfers</h3>
        <span className="text-xs text-slate-400 shrink-0">{contextLabel}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {fmt(grandTotal)} excluded from the totals & charts for this selection — untick to bring one back, tap a row for its transactions
      </p>
      {groups.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nothing is excluded for this selection</p>
      )}
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {groups.map(g => {
          const back = included.includes(g.name);
          const isOpen = open === g.name;
          return (
            <div key={g.name} className="rounded-lg hover:bg-slate-50">
              <div className={`flex items-center gap-2 text-xs p-1.5 ${back ? '' : 'opacity-60'}`}>
                <input
                  type="checkbox"
                  checked={!back}
                  onChange={() => onToggle(g.name)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
                />
                <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => setOpen(isOpen ? null : g.name)}>
                  {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                  <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{g.name}</span>
                </button>
                <span className="text-slate-400 shrink-0">{g.count}×</span>
                <span className="font-medium text-slate-700 w-20 text-right shrink-0">{fmt(g.total)}</span>
                <span className={`text-[10px] w-14 text-right shrink-0 ${back ? 'text-emerald-600' : 'text-slate-400'}`}>{back ? 'included' : 'excluded'}</span>
              </div>
              {isOpen && (
                <div className="ml-9 mb-1.5 space-y-0.5">
                  {g.txs.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-[11px] text-slate-500 py-0.5">
                      <span className="w-20 shrink-0">{(t.td || '').slice(0, 10)}</span>
                      <span className="flex-1 min-w-0 truncate" dir="auto">{t.srcName || '—'}</span>
                      <span className={`shrink-0 ${t.inc ? 'text-emerald-600' : ''}`}>{t.inc ? 'in' : 'out'}</span>
                      <span className="font-medium text-slate-600 w-20 text-right shrink-0">{fmt(t.amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}