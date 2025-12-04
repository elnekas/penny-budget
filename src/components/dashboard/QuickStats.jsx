import React from 'react';
import { TrendingDown, Wallet } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

export default function QuickStats({ transactions, budgets, totalAllowance = 0, currencySymbol = '$', onEditCategoryBudgets }) {
  const currentMonth = moment().format('YYYY-MM');
  const [alertShown, setAlertShown] = React.useState({ variable: false, fixed: false });
  
  const thisMonthTransactions = transactions.filter(t => 
    t.date?.startsWith(currentMonth)
  );
  
  const variableSpent = thisMonthTransactions
    .filter(t => t.amount < 0 && (t.expense_type || 'variable') === 'variable')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const allocatedTotal = budgets
    .filter(b => b.month === currentMonth)
    .reduce((sum, b) => sum + b.monthly_limit, 0);
  
  const variableBudgetRemaining = totalAllowance - variableSpent;
  const budgetPercent = totalAllowance > 0 ? (variableSpent / totalAllowance) * 100 : 0;

  // Calculate weekly safe spend
  const endOfMonth = moment().endOf('month');
  const daysRemaining = Math.max(endOfMonth.diff(moment(), 'days'), 1); // Avoid division by zero
  const weeksRemaining = daysRemaining / 7;
  const weeklySafeSpend = Math.max(variableBudgetRemaining / weeksRemaining, 0);

  // Alert when budget is exceeded
  React.useEffect(() => {
    if (totalAllowance > 0 && variableSpent > totalAllowance && !alertShown.variable) {
      alert(`⚠️ You've exceeded your monthly allowance! Spent ${currencySymbol}${variableSpent.toFixed(0)} of ${currencySymbol}${totalAllowance.toFixed(0)}`);
      setAlertShown(prev => ({ ...prev, variable: true }));
    }
  }, [variableSpent, totalAllowance, alertShown.variable, currencySymbol]);

  const stats = [
    {
      label: 'Variable Spent',
      value: `${currencySymbol}${variableSpent.toFixed(0)}`,
      icon: TrendingDown,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-50',
      subtext: `of ${currencySymbol}${allocatedTotal.toFixed(0)} allocated`,
      onClick: onEditCategoryBudgets
    },
    {
      label: 'Monthly Allowance Left',
      value: totalAllowance > 0 ? `${currencySymbol}${variableBudgetRemaining.toFixed(0)}` : 'Not set',
      icon: Wallet,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      subtext: totalAllowance > 0 ? `${(100 - budgetPercent).toFixed(0)}% remaining` : 'Set allowance',
      onClick: onEditCategoryBudgets
      },
      {
      label: 'Weekly Safe Spend',
      value: totalAllowance > 0 ? `${currencySymbol}${weeklySafeSpend.toFixed(0)}` : 'Not set',
      icon: Wallet, // Reusing Wallet icon, or could use Calendar
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      subtext: 'for remaining weeks',
      onClick: onEditCategoryBudgets
      }
      ];

      return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {stats.map((stat, idx) => (
        <div 
          key={idx}
          onClick={stat.onClick}
          className={cn(
            "bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow",
            stat.onClick && "cursor-pointer"
          )}
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