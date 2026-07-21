import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '@/components/riseup/riseupGroups';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#ec4899', '#84cc16', '#64748b', '#eab308'];

export default function PennyChart({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data.map(d => ({ ...d, value: Math.round(Number(d.value) || 0) }));
  return (
    <div className="mt-2 bg-white rounded-xl border border-slate-200 p-2">
      {chart.title && <p className="text-[11px] font-semibold text-slate-600 mb-1 px-1">{chart.title}</p>}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="85%" paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          ) : chart.type === 'line' ? (
            <LineChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {chart.type === 'pie' && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-1 pt-1">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              {d.label} · {fmt(d.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}