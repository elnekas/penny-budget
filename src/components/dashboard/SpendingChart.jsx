import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from "@/lib/utils";

const categoryColors = {
  food: '#f97316',
  transport: '#3b82f6',
  shopping: '#ec4899',
  entertainment: '#8b5cf6',
  bills: '#64748b',
  health: '#ef4444',
  education: '#06b6d4',
  travel: '#14b8a6',
  groceries: '#22c55e',
  subscriptions: '#f59e0b',
  income: '#10b981',
  savings: '#6366f1',
  other: '#94a3b8'
};

const categoryIcons = {
  food: '🍔',
  transport: '🚗',
  shopping: '🛍️',
  entertainment: '🎬',
  bills: '📄',
  health: '💊',
  education: '📚',
  travel: '✈️',
  groceries: '🛒',
  subscriptions: '📱',
  income: '💵',
  savings: '🏦',
  other: '📦'
};

export default function SpendingChart({ transactions }) {
  const categoryData = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => {
      const cat = t.category || 'other';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {});

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value, color: categoryColors[name] || categoryColors.other }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <span className="text-4xl mb-2">📊</span>
        <p>No spending data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} className="drop-shadow-sm" />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`$${value.toFixed(2)}`, '']}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="space-y-2">
        {data.slice(0, 5).map((cat, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ backgroundColor: `${cat.color}20` }}
            >
              {categoryIcons[cat.name] || '📦'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-700 capitalize">{cat.name}</span>
                <span className="text-sm font-semibold text-slate-800">${cat.value.toFixed(0)}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(cat.value / total) * 100}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}