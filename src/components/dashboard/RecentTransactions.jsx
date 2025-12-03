import React from 'react';
import moment from 'moment';
import { cn } from "@/lib/utils";

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

const categoryColors = {
  food: 'bg-orange-50',
  transport: 'bg-blue-50',
  shopping: 'bg-pink-50',
  entertainment: 'bg-purple-50',
  bills: 'bg-slate-50',
  health: 'bg-red-50',
  education: 'bg-cyan-50',
  travel: 'bg-teal-50',
  groceries: 'bg-green-50',
  subscriptions: 'bg-amber-50',
  income: 'bg-emerald-50',
  savings: 'bg-indigo-50',
  other: 'bg-slate-50'
};

export default function RecentTransactions({ transactions, currencySymbol = '$', showAddedBy = false, onEdit }) {
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (sortedTransactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <span className="text-3xl block mb-2">📝</span>
        <p>No transactions yet</p>
        <p className="text-sm">Tell Penny about your spending!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTransactions.map((t, idx) => (
        <div 
          key={t.id || idx}
          onClick={() => onEdit?.(t)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
            categoryColors[t.category] || categoryColors.other
          )}>
            {categoryIcons[t.category] || categoryIcons.other}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
            <p className="text-xs text-slate-400">
                                {t.expense_type === 'fixed' && '🔄 '}
                                {t.merchant && `${t.merchant} • `}
                                {moment(t.date).format('MMM D')}
                                {showAddedBy && t.added_by_name && ` • by ${t.added_by_name}`}
                              </p>
          </div>
          <p className={cn(
            "text-sm font-semibold",
            t.amount < 0 ? "text-slate-800" : "text-emerald-600"
          )}>
            {t.amount < 0 ? '-' : '+'}{currencySymbol}{Math.abs(t.amount).toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
}