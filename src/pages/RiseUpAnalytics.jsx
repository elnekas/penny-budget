import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DeepDiveTable from '@/components/riseup/analytics/DeepDiveTable';
import { useRiseUpData } from '@/components/riseup/useRiseUpData';
import { cleanExpenses } from '@/components/riseup/analytics/analyticsUtils';
import SpendingPie from '@/components/riseup/analytics/SpendingPie';
import IncomeSourcesPie from '@/components/riseup/analytics/IncomeSourcesPie';
import MonthCompare from '@/components/riseup/analytics/MonthCompare';
import CategoryCompare from '@/components/riseup/analytics/CategoryCompare';

export default function RiseUpAnalytics() {
  const { snapshot, transactions, loading, error } = useRiseUpData();
  const [deepDive, setDeepDive] = useState(false);

  const { data: externals = [] } = useQuery({
    queryKey: ['external-income'],
    queryFn: () => base44.entities.ExternalIncome.list('-created_date', 100)
  });
  const { data: potTransfers = [] } = useQuery({
    queryKey: ['deposit-transfers'],
    queryFn: () => base44.entities.DepositTransfer.list('-created_date', 500)
  });

  const { expenses, categories } = useMemo(() => {
    const exp = cleanExpenses(transactions.filter(t => !t.planned));
    return { expenses: exp, categories: [...new Set(exp.map(t => t.category))].sort() };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 p-4">
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
    <main className="max-w-5xl mx-auto p-4 space-y-5 pb-28">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Spending Analytics</h1>
          <p className="text-xs text-slate-400">Explore, compare and discover your spending patterns</p>
        </div>
        <Button
          variant={deepDive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDeepDive(!deepDive)}
          className={`rounded-full gap-1.5 ${deepDive ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400' : 'text-slate-700 border-slate-200'}`}
        >
          <Terminal className="w-4 h-4" />
          Deep Dive
        </Button>
      </div>

      {deepDive && (
        <DeepDiveTable expenses={expenses} months={months} monthLabels={monthLabels} />
      )}

      {!deepDive && (<>
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-4 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">🥧 Where does it all go?</h3>
          <SpendingPie expenses={expenses} months={months} monthLabels={monthLabels} />
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">⚖️ Month vs Month</h3>
          <MonthCompare expenses={expenses} months={months} monthLabels={monthLabels} />
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">💰 Where does it come from?</h3>
          <IncomeSourcesPie transactions={transactions} months={months} monthLabels={monthLabels} externals={externals} transfers={potTransfers} />
        </Card>
      </div>

      <Card className="p-4 border-0 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-1 text-sm">🔍 Compare & discover</h3>
        <p className="text-xs text-slate-400 mb-3">
          Put any two spending areas side by side — e.g. do you eat out more in months you spend less at the super?
        </p>
        <CategoryCompare expenses={expenses} months={months} categories={categories} />
      </Card>
      </>)}
    </main>
  );
}