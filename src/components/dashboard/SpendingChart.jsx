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

export default function SpendingChart({ transactions, budgets = [], currencySymbol = '$' }) {
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
              formatter={(value) => [`${currencySymbol}${value.toFixed(2)}`, '']}
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
        {data.slice(0, 5).map((cat, idx) => {
          const categoryBudget = budgets.find(b => b.category === cat.name);
          const budgetLimit = categoryBudget?.monthly_limit || 0;
          const budgetPercent = budgetLimit > 0 ? Math.min((cat.value / budgetLimit) * 100, 100) : 0;
          const isOverBudget = budgetLimit > 0 && cat.value > budgetLimit;
          
          return (
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
                  <span className="text-sm font-semibold text-slate-800">{currencySymbol}{cat.value.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(cat.value / total) * 100}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
              {budgetLimit > 0 ? (
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border-2",
                  isOverBudget 
                    ? "border-red-400 text-red-600 bg-red-50" 
                    : budgetPercent >= 80 
                      ? "border-amber-400 text-amber-600 bg-amber-50"
                      : "border-emerald-400 text-emerald-600 bg-emerald-50"
                )}>
                  {Math.round(budgetPercent)}%
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-200">
                  --
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}