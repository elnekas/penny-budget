import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useRiseUpData } from '@/components/riseup/useRiseUpData';
import { cleanExpenses } from '@/components/riseup/analytics/analyticsUtils';
import SpendingPie from '@/components/riseup/analytics/SpendingPie';
import MonthCompare from '@/components/riseup/analytics/MonthCompare';
import CategoryCompare from '@/components/riseup/analytics/CategoryCompare';

export default function RiseUpAnalytics() {
  const { snapshot, transactions, loading, error } = useRiseUpData();

  const { expenses, categories } = useMemo(() => {
    const exp = cleanExpenses(transactions);
    return { expenses: exp, categories: [...new Set(exp.map(t => t.category))].sort() };
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center border-0 shadow-sm">
          <p className="text-rose-600 font-semibold mb-1">Couldn't load RiseUp data</p>
          <p className="text-sm text-slate-500">{error.message}</p>
        </Card>
      </div>
    );
  }

  const months = snapshot.months;
  const monthLabels = snapshot.month_labels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/riseup-dashboard" className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Spending Analytics</h1>
            <p className="text-xs text-slate-400">Explore, compare and discover your spending patterns</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-5 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">🥧 Where does it all go?</h3>
            <SpendingPie expenses={expenses} months={months} monthLabels={monthLabels} />
          </Card>

          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">⚖️ Month vs Month</h3>
            <MonthCompare expenses={expenses} months={months} monthLabels={monthLabels} />
          </Card>
        </div>

        <Card className="p-4 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-1 text-sm">🔍 Compare & discover</h3>
          <p className="text-xs text-slate-400 mb-3">
            Put any two spending areas side by side — e.g. do you eat out more in months you spend less at the super?
          </p>
          <CategoryCompare expenses={expenses} months={months} categories={categories} />
        </Card>
      </main>
    </div>
  );
}