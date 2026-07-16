import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '@/components/riseup/riseupGroups';
import { SLICE_COLORS } from './plannerUtils';

const RADIAN = Math.PI / 180;

const renderLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, value, percent } = props;
  if (percent < 0.035) return null;
  const emoji = props.emoji || props.payload?.emoji || '';
  const r = outerRadius + 12;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      fontSize={10} fontWeight={600} fill="#475569">
      {emoji} {fmt(value)}
    </text>
  );
};

export default function PlannerPie({ slices, savings, budget, caption = 'Budget', savedWord = 'saved' }) {
  const data = [
    ...slices.map(s => ({ name: s.label, emoji: s.emoji, value: s.value, color: SLICE_COLORS[s.status] })),
    ...(savings > 0 ? [{ name: '✨ Savings', emoji: '✨', value: savings, color: 'url(#plannerGold)' }] : [])
  ].filter(d => d.value > 0);

  return (
    <div className="relative h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 16, bottom: 16, left: 8, right: 8 }}>
          <defs>
            <linearGradient id="plannerGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="74%"
            paddingAngle={2.5} strokeWidth={0} cornerRadius={6} isAnimationActive={false}
            labelLine={false} label={renderLabel}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">{caption}</span>
        <span className="text-xl font-bold text-slate-800">{fmt(budget)}</span>
        {savings > 0 && (
          <span className="mt-0.5 text-xs font-semibold text-amber-600">✨ {fmt(savings)} {savedWord}</span>
        )}
        {savings < 0 && (
          <span className="mt-0.5 text-xs font-semibold text-rose-500">{fmt(-savings)} over</span>
        )}
      </div>
    </div>
  );
}