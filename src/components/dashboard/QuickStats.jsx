import React from 'react';
import { TrendingDown, TrendingUp, Wallet, Target } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

export default function QuickStats({ transactions, budgets, currencySymbol = '$' }) {
  const currentMonth = moment().format('YYYY-MM');
  
  const thisMonthTransactions = transactions.filter(t => 
    t.date?.startsWith(currentMonth)
  );
  
  const totalSpent = thisMonthTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalIncome = thisMonthTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalBudget = budgets
    .filter(b => b.month === currentMonth)
    .reduce((sum, b) => sum + b.monthly_limit, 0);
  
  const budgetRemaining = totalBudget - totalSpent;
  const budgetPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const stats = [
    {
      label: 'Spent This Month',
      value: `${currencySymbol}${totalSpent.toFixed(0)}`,
      icon: TrendingDown,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-50'
    },
    {
      label: 'Income',
      value: `${currencySymbol}${totalIncome.toFixed(0)}`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Budget Left',
      value: totalBudget > 0 ? `${currencySymbol}${budgetRemaining.toFixed(0)}` : 'Not set',
      icon: Wallet,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      subtext: totalBudget > 0 ? `${(100 - budgetPercent).toFixed(0)}% remaining` : null
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, idx) => (
        <div 
          key={idx}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bgColor)}>
            <stat.icon className={cn("w-5 h-5 bg-gradient-to-r bg-clip-text", stat.color.replace('from-', 'text-').split(' ')[0])} />
          </div>
          <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
          <p className="text-xl font-bold text-slate-800">{stat.value}</p>
          {stat.subtext && (
            <p className="text-xs text-slate-400 mt-1">{stat.subtext}</p>
          )}
        </div>
      ))}
    </div>
  );
}