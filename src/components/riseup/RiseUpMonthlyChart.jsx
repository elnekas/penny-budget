import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fmt } from './riseupGroups';

export default function RiseUpMonthlyChart({ data, showBuffer, showPlanned }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => fmt(val)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Income" fill="#3b82f6" radius={[8, 8, 8, 8]} maxBarSize={28} />
          {showBuffer && <Bar dataKey="Buffer draw" fill="#f59e0b" radius={[8, 8, 8, 8]} maxBarSize={28} />}
          <Bar dataKey="Expense" fill="#fb7185" radius={[8, 8, 8, 8]} maxBarSize={28} />
          {showPlanned && <Bar dataKey="Planned" fill="#8b5cf6" radius={[8, 8, 8, 8]} maxBarSize={28} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}