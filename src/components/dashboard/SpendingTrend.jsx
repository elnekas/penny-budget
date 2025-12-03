import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import moment from 'moment';

export default function SpendingTrend({ transactions }) {
  // Group by day for the last 30 days
  const last30Days = [...Array(30)].map((_, i) => {
    const date = moment().subtract(29 - i, 'days');
    return {
      date: date.format('MMM D'),
      fullDate: date.format('YYYY-MM-DD'),
      spending: 0
    };
  });

  transactions.forEach(t => {
    if (t.amount < 0) {
      const day = last30Days.find(d => d.fullDate === t.date);
      if (day) {
        day.spending += Math.abs(t.amount);
      }
    }
  });

  // Calculate cumulative
  let cumulative = 0;
  const data = last30Days.map(d => {
    cumulative += d.spending;
    return { ...d, cumulative };
  });

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            hide 
            domain={[0, 'auto']}
          />
          <Tooltip 
            formatter={(value) => [`$${value.toFixed(2)}`, 'Total Spent']}
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#spendingGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}