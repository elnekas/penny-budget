import React, { useState } from 'react';
import moment from 'moment';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
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
  other: '📦'
};

export default function BudgetAlerts({ transactions, budgets, currencySymbol = '$' }) {
  const currentMonth = moment().format('YYYY-MM');
  const storageKey = `dismissed_alerts_${currentMonth}`;
  
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const dismissAlert = (category) => {
    const updated = [...dismissedAlerts, category];
    setDismissedAlerts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  
  const currentBudgets = budgets.filter(b => b.month === currentMonth);
  
  if (currentBudgets.length === 0) return null;

  const alerts = currentBudgets.map(budget => {
    const categorySpent = transactions
      .filter(t => 
        t.date?.startsWith(currentMonth) && 
        t.category === budget.category && 
        t.amount < 0
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const percentUsed = (categorySpent / budget.monthly_limit) * 100;
    const threshold = budget.alert_threshold || 80;
    
    let status = 'ok';
    if (percentUsed >= 100) {
      status = 'exceeded';
    } else if (percentUsed >= threshold) {
      status = 'warning';
    }
    
    return {
      category: budget.category,
      spent: categorySpent,
      limit: budget.monthly_limit,
      percentUsed,
      threshold,
      status
    };
  }).filter(a => a.status !== 'ok' && !dismissedAlerts.includes(a.category));

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.category}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            alert.status === 'exceeded' 
              ? "bg-red-50 border border-red-200" 
              : "bg-amber-50 border border-amber-200"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            alert.status === 'exceeded' ? "bg-red-100" : "bg-amber-100"
          )}>
            {alert.status === 'exceeded' 
              ? <AlertCircle className="w-4 h-4 text-red-600" />
              : <AlertTriangle className="w-4 h-4 text-amber-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryIcons[alert.category] || '📦'}</span>
              <span className="font-medium text-slate-800 capitalize">{alert.category}</span>
            </div>
            <p className={cn(
              "text-xs",
              alert.status === 'exceeded' ? "text-red-600" : "text-amber-600"
            )}>
              {alert.status === 'exceeded' 
                ? `Exceeded by ${currencySymbol}${(alert.spent - alert.limit).toFixed(0)}`
                : `${alert.percentUsed.toFixed(0)}% used (${currencySymbol}${alert.spent.toFixed(0)} of ${currencySymbol}${alert.limit.toFixed(0)})`
              }
            </p>
          </div>
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            alert.status === 'exceeded' 
              ? "bg-red-200 text-red-700" 
              : "bg-amber-200 text-amber-700"
          )}>
            {alert.percentUsed.toFixed(0)}%
          </div>
          <button
            onClick={() => dismissAlert(alert.category)}
            className={cn(
              "p-1 rounded-full hover:bg-white/50 transition-colors",
              alert.status === 'exceeded' ? "text-red-400" : "text-amber-400"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}