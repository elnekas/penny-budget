import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../riseupGroups';
import { PALETTE, totalsBy } from './analyticsUtils';
import { monthlyILSForMonth, countsInMonth, hasLanded, isBuffer, bufferUncountedILSForMonth } from '@/components/budget/externalIncomeUtils';

const OVERSEAS_SHADES = ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7', '#065f46'];

export default function IncomeSourcesPie({ transactions, months, monthLabels, externals, transfers }) {
  const [month, setMonth] = useState('all');
  const [hidden, setHidden] = useState([]);

  const toggle = (name) => setHidden(h => h.includes(name) ? h.filter(n => n !== name) : [...h, name]);

  const { allRows } = useMemo(() => {
    const txs = transactions.filter(t =>
      t.inc && !t.ignored && !t.internal && (month === 'all' || t.m === month)
    );
    let rows = Object.entries(totalsBy(txs, t => t.name))
      .sort((a, b) => b[1] - a[1])
      .map(([k, v], i) => ({ name: k, value: Math.round(v), color: PALETTE[i % PALETTE.length] }));
    // Break overseas income down per source
    const monthList = month === 'all' ? months : [month];
    (externals || []).filter(e => !isBuffer(e)).forEach((e, i) => {
      const amt = monthList.reduce((s, m) =>
        s + (countsInMonth(e, m, transfers) && hasLanded(e, m, transfers) ? monthlyILSForMonth(e, m, transfers) : 0), 0);
      if (amt > 0) rows.push({ name: `🌎 ${e.source_name}`, value: Math.round(amt), color: OVERSEAS_SHADES[i % OVERSEAS_SHADES.length] });
    });
    // Savings buffer draws not already visible as RiseUp deposits
    const bufAmt = monthList.reduce((s, m) => s + bufferUncountedILSForMonth(externals, m, transfers), 0);
    if (bufAmt > 0) rows.push({ name: '💵 Savings buffer draw', value: Math.round(bufAmt), color: '#0ea5e9' });
    rows.sort((a, b) => b.value - a.value);
    return { allRows: rows.filter(r => r.value > 0) };
  }, [transactions, month, months, externals, transfers]);

  const data = allRows.filter(r => !hidden.includes(r.name));
  const total = data.reduce((s, r) => s + r.value, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
          <option value="all">All months</option>
          {months.map(m => <option key={m} value={m}>{monthLabels?.[m] || m}</option>)}
        </select>
      </div>

      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Total in</span>
          <span className="text-lg font-bold text-slate-800">{fmt(total)}</span>
        </div>
      </div>

      <div className="mt-2 space-y-1 max-h-44 overflow-y-auto pr-1">
        {allRows.map(d => {
          const off = hidden.includes(d.name);
          return (
            <label key={d.name} className={`flex items-center gap-2 text-xs cursor-pointer ${off ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={!off}
                onChange={() => toggle(d.name)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{d.name}</span>
              <span className="text-slate-400">{!off && total ? Math.round(d.value / total * 100) + '%' : ''}</span>
              <span className="font-medium text-slate-700 w-16 text-right">{fmt(d.value)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}