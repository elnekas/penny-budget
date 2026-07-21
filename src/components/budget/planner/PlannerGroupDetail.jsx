import React, { useMemo } from 'react';
import { fmt } from '@/components/riseup/riseupGroups';

const countable = (t) => !t.inc && !t.ignored && !t.planned && !t.internal;

export default function PlannerGroupDetail({ transactions, month, avgMonths, group }) {
  const { weeks, expected, spentTotal } = useMemo(() => {
    const spent = transactions
      .filter(t => t.m === month && t.group === group && countable(t))
      .sort((a, b) => (a.td || '').localeCompare(b.td || ''));
    const spentNames = new Set(spent.map(t => t.name));
    // Weekly buckets by day of month: 1–7, 8–14, 15–21, 22–end
    const labels = ['Days 1–7', 'Days 8–14', 'Days 15–21', 'Days 22–end'];
    const weekArr = [];
    spent.forEach(t => {
      const day = Number((t.td || '').slice(8, 10)) || 1;
      const idx = Math.min(Math.floor((day - 1) / 7), 3);
      if (!weekArr[idx]) weekArr[idx] = { label: labels[idx], total: 0, items: [] };
      weekArr[idx].total += t.amt;
      weekArr[idx].items.push(t);
    });
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
    return { weeks: weekArr.filter(Boolean), expected, spentTotal: spent.reduce((s, t) => s + t.amt, 0) };
  }, [transactions, month, avgMonths, group]);

  return (
    <div className="mt-2 ml-4 border-l-2 border-slate-100 pl-3 space-y-2.5 text-xs pb-1">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Already spent · {fmt(spentTotal)}</p>
        {weeks.length === 0 && <p className="text-slate-400">Nothing spent yet this month</p>}
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {weeks.map((w) => (
            <div key={w.label}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-px whitespace-nowrap">{w.label}</span>
                <span className="flex-1 border-t border-dashed border-slate-200" />
                <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">{fmt(w.total)}</span>
              </div>
              <div className="space-y-0.5">
                {w.items.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-400 w-10 shrink-0 tabular-nums">{(t.td || '').slice(5)}</span>
                    <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{t.name}</span>
                    <span className="font-medium text-slate-700 whitespace-nowrap">{fmt(t.amt)}</span>
                  </div>
                ))}
              </div>
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