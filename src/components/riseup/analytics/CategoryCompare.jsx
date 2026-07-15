import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GROUPS, fmt } from '../riseupGroups';
import { GROUP_COLORS, PALETTE, monthShort } from './analyticsUtils';
import CategoryMultiSelect from '../CategoryMultiSelect';
import CompareInsight from './CompareInsight';

const btnCls = (active) => `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`;

export default function CategoryCompare({ expenses, months, categories }) {
  const [mode, setMode] = useState('group');
  const [selGroups, setSelGroups] = useState(['food', 'dining']);
  const [selCats, setSelCats] = useState([]);

  const keys = mode === 'group' ? selGroups.map(g => GROUPS[g]?.label || g) : selCats;
  const colors = mode === 'group' ? selGroups.map(g => GROUP_COLORS[g] || '#64748b') : selCats.map((_, i) => PALETTE[i % PALETTE.length]);

  const data = useMemo(() => months.map(m => {
    const row = { label: monthShort(m) };
    const txs = expenses.filter(t => t.m === m);
    if (mode === 'group') {
      selGroups.forEach(g => { row[GROUPS[g]?.label || g] = Math.round(txs.filter(t => t.group === g).reduce((s, t) => s + t.amt, 0)); });
    } else {
      selCats.forEach(c => { row[c] = Math.round(txs.filter(t => t.category === c).reduce((s, t) => s + t.amt, 0)); });
    }
    return row;
  }), [expenses, months, mode, selGroups, selCats]);

  const toggleGroup = (g) => setSelGroups(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g]);
  const groupIds = Object.keys(GROUPS).filter(g => g !== 'income');
  const pairs = keys.length === 2 ? data.slice(0, -1).map(r => ({ a: r[keys[0]] || 0, b: r[keys[1]] || 0 })) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex bg-slate-50 border border-slate-200 rounded-full p-0.5">
          <button className={btnCls(mode === 'group')} onClick={() => setMode('group')}>Groups</button>
          <button className={btnCls(mode === 'category')} onClick={() => setMode('category')}>Categories</button>
        </div>
        {mode === 'category' && (
          <CategoryMultiSelect categories={categories} selected={selCats} onChange={setSelCats} />
        )}
        <span className="text-[10px] text-slate-400 ml-auto">Pick exactly 2 to unlock an insight 💡</span>
      </div>

      {mode === 'group' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {groupIds.map(g => (
            <button key={g} onClick={() => toggleGroup(g)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                selGroups.includes(g) ? 'border-transparent text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              style={selGroups.includes(g) ? { background: GROUP_COLORS[g] } : undefined}>
              {GROUPS[g].emoji} {GROUPS[g].label}
            </button>
          ))}
        </div>
      )}

      {keys.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Select at least one {mode === 'group' ? 'group' : 'category'} to compare</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => '₪' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {keys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {pairs && <CompareInsight nameA={keys[0]} nameB={keys[1]} pairs={pairs} />}
    </div>
  );
}