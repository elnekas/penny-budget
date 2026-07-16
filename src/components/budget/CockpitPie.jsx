import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { GROUPS, fmt, isInternal } from '@/components/riseup/riseupGroups';
import { GROUP_COLORS, PALETTE, totalsBy } from '@/components/riseup/analytics/analyticsUtils';

const btnCls = (active) => `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`;

export default function CockpitPie({ transactions, month, monthLabel }) {
  const [mode, setMode] = useState('group');

  const { data, total } = useMemo(() => {
    const txs = transactions.filter(t => t.m === month && !t.inc && !t.ignored && !t.planned && !isInternal(t.name));
    let rows;
    if (mode === 'group') {
      rows = Object.entries(totalsBy(txs, t => t.group))
        .map(([k, v]) => ({ name: `${GROUPS[k]?.emoji || ''} ${GROUPS[k]?.label || k}`, value: Math.round(v), color: GROUP_COLORS[k] || '#a8a29e' }));
    } else {
      rows = Object.entries(totalsBy(txs, t => t.category))
        .sort((a, b) => b[1] - a[1])
        .map(([k, v], i) => ({ name: k, value: Math.round(v), color: PALETTE[i % PALETTE.length] }));
      if (rows.length > 9) {
        const rest = rows.slice(9);
        rows = [...rows.slice(0, 9), { name: 'Other categories', value: rest.reduce((s, r) => s + r.value, 0), color: '#cbd5e1' }];
      }
    }
    rows.sort((a, b) => b.value - a.value);
    return { data: rows.filter(r => r.value > 0), total: rows.reduce((s, r) => s + r.value, 0) };
  }, [transactions, month, mode]);

  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-slate-800 text-sm flex-1">🥧 Spend Allocation · {monthLabel}</h3>
        <div className="flex bg-slate-50 border border-slate-200 rounded-full p-0.5">
          <button className={btnCls(mode === 'group')} onClick={() => setMode('group')}>Groups</button>
          <button className={btnCls(mode === 'category')} onClick={() => setMode('category')}>Categories</button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No spending recorded this month yet</p>
      ) : (<>
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} strokeWidth={0}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Spent</span>
            <span className="text-lg font-bold text-slate-800">{fmt(total)}</span>
          </div>
        </div>

        <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="flex-1 min-w-0 truncate text-slate-600" dir="auto">{d.name}</span>
              <span className="text-slate-400">{total ? Math.round(d.value / total * 100) : 0}%</span>
              <span className="font-medium text-slate-700 w-16 text-right">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </>)}
    </Card>
  );
}