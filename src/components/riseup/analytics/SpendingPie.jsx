import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GROUPS, fmt } from '../riseupGroups';
import { GROUP_COLORS, PALETTE, totalsBy } from './analyticsUtils';

const btnCls = (active) => `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`;

export default function SpendingPie({ expenses, months, monthLabels }) {
  const [month, setMonth] = useState('all');
  const [mode, setMode] = useState('group');
  const [hidden, setHidden] = useState([]);

  const toggle = (name) => setHidden(h => h.includes(name) ? h.filter(n => n !== name) : [...h, name]);

  const { allRows, data, total } = useMemo(() => {
    const txs = month === 'all' ? expenses : expenses.filter(t => t.m === month);
    let rows;
    if (mode === 'group') {
      rows = Object.entries(totalsBy(txs, t => t.group))
        .map(([k, v]) => ({ name: `${GROUPS[k]?.emoji || ''} ${GROUPS[k]?.label || k}`, value: Math.round(v), color: GROUP_COLORS[k] || '#a8a29e' }));
    } else {
      rows = Object.entries(totalsBy(txs, t => t.category))
        .sort((a, b) => b[1] - a[1])
        .map(([k, v], i) => ({ name: k, value: Math.round(v), color: PALETTE[i % PALETTE.length] }));
      if (rows.length > 11) {
        const rest = rows.slice(11);
        rows = [...rows.slice(0, 11), { name: 'Other categories', value: rest.reduce((s, r) => s + r.value, 0), color: '#cbd5e1' }];
      }
    }
    rows.sort((a, b) => b.value - a.value);
    const all = rows.filter(r => r.value > 0);
    const visible = all.filter(r => !hidden.includes(r.name));
    return { allRows: all, data: visible, total: visible.reduce((s, r) => s + r.value, 0) };
  }, [expenses, month, mode, hidden]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
          <option value="all">All months</option>
          {months.map(m => <option key={m} value={m}>{monthLabels?.[m] || m}</option>)}
        </select>
        <div className="flex bg-slate-50 border border-slate-200 rounded-full p-0.5 ml-auto">
          <button className={btnCls(mode === 'group')} onClick={() => setMode('group')}>Groups</button>
          <button className={btnCls(mode === 'category')} onClick={() => setMode('category')}>Categories</button>
        </div>
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
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-lg font-bold text-slate-800">{fmt(total)}</span>
        </div>
      </div>

      <div className="mt-2 space-y-1 max-h-44 overflow-y-auto pr-1">
        {allRows.map(d => {
          const off = hidden.includes(d.name);
          return (
            <label key={d.name} className={`flex items-center gap-2 text-xs cursor-pointer rounded-md px-1 py-0.5 hover:bg-slate-50 ${off ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={!off}
                onChange={() => toggle(d.name)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 shrink-0"
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{d.name}</span>
              <span className="text-slate-400">{!off && total ? Math.round(d.value / total * 100) + '%' : '—'}</span>
              <span className="font-medium text-slate-700 w-16 text-right">{fmt(d.value)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}