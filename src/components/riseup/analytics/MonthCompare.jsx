import React, { useState, useMemo } from 'react';
import { GROUPS, fmt } from '../riseupGroups';
import { GROUP_COLORS, totalsBy } from './analyticsUtils';

const selCls = "px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default function MonthCompare({ expenses, months, monthLabels }) {
  const [mA, setMA] = useState(months[months.length - 3] || months[0]);
  const [mB, setMB] = useState(months[months.length - 2] || months[months.length - 1]);

  const { rows, totA, totB, maxVal } = useMemo(() => {
    const tA = totalsBy(expenses.filter(t => t.m === mA), t => t.group);
    const tB = totalsBy(expenses.filter(t => t.m === mB), t => t.group);
    const keys = [...new Set([...Object.keys(tA), ...Object.keys(tB)])];
    const rs = keys.map(g => ({ g, a: Math.round(tA[g] || 0), b: Math.round(tB[g] || 0) }))
      .filter(r => r.a > 0 || r.b > 0)
      .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
    return {
      rows: rs,
      totA: rs.reduce((s, r) => s + r.a, 0),
      totB: rs.reduce((s, r) => s + r.b, 0),
      maxVal: Math.max(1, ...rs.map(r => Math.max(r.a, r.b)))
    };
  }, [expenses, mA, mB]);

  const totDelta = totB - totA;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <select value={mA} onChange={e => setMA(e.target.value)} className={selCls}>
          {months.map(m => <option key={m} value={m}>{monthLabels?.[m] || m}</option>)}
        </select>
        <span className="text-xs text-slate-400">vs</span>
        <select value={mB} onChange={e => setMB(e.target.value)} className={selCls}>
          {months.map(m => <option key={m} value={m}>{monthLabels?.[m] || m}</option>)}
        </select>
        <span className={`ml-auto text-xs font-semibold ${totDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {totDelta > 0 ? '+' : '−'}{fmt(Math.abs(totDelta))} total
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> {monthLabels?.[mA] || mA} ({fmt(totA)})</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {monthLabels?.[mB] || mB} ({fmt(totB)})</span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {rows.map(r => {
          const delta = r.b - r.a;
          return (
            <div key={r.g}>
              <div className="flex items-center text-xs mb-0.5">
                <span className="text-slate-600">{GROUPS[r.g]?.emoji} {GROUPS[r.g]?.label || r.g}</span>
                <span className={`ml-auto font-medium ${delta > 0 ? 'text-rose-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {delta === 0 ? '=' : (delta > 0 ? '▲ +' : '▼ −') + fmt(Math.abs(delta))}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="h-1.5 rounded-full bg-slate-300" style={{ width: `${Math.max(2, r.a / maxVal * 100)}%` }} title={fmt(r.a)} />
                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, r.b / maxVal * 100)}%`, background: GROUP_COLORS[r.g] || '#10b981' }} title={fmt(r.b)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}