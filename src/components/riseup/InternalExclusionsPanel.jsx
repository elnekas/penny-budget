import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { isInternal, fmt } from './riseupGroups';

export default function InternalExclusionsPanel({ transactions, included, onToggle }) {
  const groups = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!isInternal(t.name)) return;
      if (!map[t.name]) map[t.name] = { name: t.name, count: 0, total: 0 };
      map[t.name].count += 1;
      map[t.name].total += t.amt;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [transactions]);

  if (groups.length === 0) return null;

  return (
    <Card className="p-4 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-800 text-sm mb-1">Hidden card settlements & transfers</h3>
      <p className="text-xs text-slate-400 mb-3">These are excluded from all totals and charts — untick to bring one back in</p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {groups.map(g => {
          const back = included.includes(g.name);
          return (
            <label key={g.name} className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 ${back ? '' : 'opacity-60'}`}>
              <input
                type="checkbox"
                checked={!back}
                onChange={() => onToggle(g.name)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
              />
              <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{g.name}</span>
              <span className="text-slate-400 shrink-0">{g.count}×</span>
              <span className="font-medium text-slate-700 w-20 text-right shrink-0">{fmt(g.total)}</span>
              <span className={`text-[10px] w-14 text-right shrink-0 ${back ? 'text-emerald-600' : 'text-slate-400'}`}>{back ? 'included' : 'excluded'}</span>
            </label>
          );
        })}
      </div>
    </Card>
  );
}