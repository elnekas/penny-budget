import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GROUPS, fmt } from './riseupGroups';
import { cn } from '@/lib/utils';

export default function GroupBreakdown({ transactions, activeGroup, onSelectGroup }) {
  const [expanded, setExpanded] = useState(null);

  const expenses = transactions.filter(t => !t.inc && !t.ignored);
  const total = expenses.reduce((s, t) => s + t.amt, 0);

  const byGroup = {};
  expenses.forEach(t => {
    if (!byGroup[t.group]) byGroup[t.group] = { total: 0, count: 0, cats: {} };
    byGroup[t.group].total += t.amt;
    byGroup[t.group].count++;
    byGroup[t.group].cats[t.category] = (byGroup[t.group].cats[t.category] || 0) + t.amt;
  });

  const sorted = Object.entries(byGroup).sort((a, b) => b[1].total - a[1].total);

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">No expenses in this view</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map(([gid, g]) => {
        const meta = GROUPS[gid] || GROUPS.other;
        const pct = total > 0 ? (g.total / total) * 100 : 0;
        const isExpanded = expanded === gid;
        const isActive = activeGroup === gid;
        return (
          <div key={gid} className={cn("rounded-xl border transition-colors", isActive ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-white")}>
            <div className="flex items-center gap-2 p-3">
              <button
                onClick={() => setExpanded(isExpanded ? null : gid)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onSelectGroup(isActive ? null : gid)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {meta.emoji} {meta.label}
                    <span className="text-xs text-slate-400 ml-1.5">({g.count})</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-800 shrink-0">
                    {fmt(g.total)}
                    <span className="text-xs text-slate-400 font-normal ml-1">{Math.round(pct)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </button>
            </div>
            {isExpanded && (
              <div className="px-4 pb-3 pl-11 space-y-1">
                {Object.entries(g.cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-xs text-slate-500">
                    <span dir="auto">{cat}</span>
                    <span className="font-medium">{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}