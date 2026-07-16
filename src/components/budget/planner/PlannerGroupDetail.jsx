import React, { useMemo } from 'react';
import { fmt } from '@/components/riseup/riseupGroups';

const countable = (t) => !t.inc && !t.ignored && !t.planned && !t.internal;

export default function PlannerGroupDetail({ transactions, month, avgMonths, group }) {
  const { spent, expected, spentTotal } = useMemo(() => {
    const spent = transactions
      .filter(t => t.m === month && t.group === group && countable(t))
      .sort((a, b) => (b.td || '').localeCompare(a.td || ''));
    const spentNames = new Set(spent.map(t => t.name));
    const set = new Set(avgMonths);
    const agg = {};
    transactions.forEach(t => {
      if (!set.has(t.m) || t.group !== group || !t.fixed || !countable(t)) return;
      if (!agg[t.name]) agg[t.name] = { total: 0, months: new Set() };
      agg[t.name].total += t.amt;
      agg[t.name].months.add(t.m);
    });
    const expected = Object.entries(agg)
      .filter(([name, v]) => !spentNames.has(name) && v.months.size >= Math.max(2, Math.ceil(avgMonths.length / 2)))
      .map(([name, v]) => ({ name, amt: Math.round(v.total / v.months.size) }))
      .sort((a, b) => b.amt - a.amt);
    return { spent, expected, spentTotal: spent.reduce((s, t) => s + t.amt, 0) };
  }, [transactions, month, avgMonths, group]);

  return (
    <div className="mt-2 ml-4 border-l-2 border-slate-100 pl-3 space-y-2.5 text-xs pb-1">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Already spent · {fmt(spentTotal)}</p>
        {spent.length === 0 && <p className="text-slate-400">Nothing spent yet this month</p>}
        <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
          {spent.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-400 w-10 shrink-0 tabular-nums">{(t.td || '').slice(5)}</span>
              <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{t.name}</span>
              <span className="font-medium text-slate-700 whitespace-nowrap">{fmt(t.amt)}</span>
            </div>
          ))}
        </div>
      </div>
      {expected.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
            Expected fixed still to come · {fmt(expected.reduce((s, e) => s + e.amt, 0))}
          </p>
          <div className="space-y-0.5">
            {expected.map(e => (
              <div key={e.name} className="flex items-center gap-2">
                <span className="w-10 shrink-0">🔒</span>
                <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{e.name}</span>
                <span className="font-medium text-slate-500 whitespace-nowrap">~{fmt(e.amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}