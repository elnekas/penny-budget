import React, { useState, useEffect, useContext } from 'react';
import { Loader2 } from 'lucide-react';
import { useBudgetData } from '@/components/budget/useBudgetData';
import FreedomGauge from '@/components/budget/FreedomGauge';
import CategoryGoals from '@/components/budget/CategoryGoals';
import ExternalIncomeManager from '@/components/budget/ExternalIncomeManager';
import FixedExpensePanel from '@/components/budget/FixedExpensePanel';
import FocusStage from '@/components/budget/FocusStage';
import { PennyActionContext } from '@/components/finance/FinanceShell';

const selectCls = "px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default function BudgetCockpit() {
  const {
    snapshot, transactions, monthly, months, categoryAvg,
    externals, externalSpendILS, externalReinvestILS,
    goals, saveExternal, deleteExternal, saveGoal, loadingBudget, error
  } = useBudgetData();

  const { action, clear } = useContext(PennyActionContext);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    if (months.length && !selectedMonth) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);

  const handleUiAction = (a) => {
    if (!a?.type || a.type === 'reset') { setFocus(null); return; }
    if (a.type === 'show_gauge') {
      setFocus(null);
      if (a.month && monthly[a.month]) setSelectedMonth(a.month);
      return;
    }
    setFocus(a);
  };

  // Apply UI actions Penny sends (from any tab)
  useEffect(() => {
    if (!action || loadingBudget) return;
    handleUiAction(action);
    clear();
  }, [action, loadingBudget]);

  if (loadingBudget) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32 px-4">
        <p className="text-rose-600 text-sm">Couldn't load your financial data: {error.message}</p>
      </div>
    );
  }

  const monthLabel = snapshot?.month_labels?.[selectedMonth] || selectedMonth;

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-5 pb-32">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Budget Cockpit</h1>
          <p className="text-xs text-slate-400">Your growth & goals command center</p>
        </div>
        <select value={selectedMonth || ''} onChange={e => setSelectedMonth(e.target.value)} className={selectCls}>
          {months.map(m => <option key={m} value={m}>{snapshot?.month_labels?.[m] || m}</option>)}
        </select>
      </div>

      <FocusStage
        focus={focus}
        monthly={monthly}
        monthLabels={snapshot?.month_labels}
        categoryAvg={categoryAvg}
        onClose={() => setFocus(null)}
      />

      <div className="grid md:grid-cols-2 gap-5">
        <FreedomGauge
          stat={monthly[selectedMonth]}
          externalSpend={externalSpendILS}
          externalReinvest={externalReinvestILS}
          label={monthLabel}
        />
        <ExternalIncomeManager
          externals={externals}
          onSave={(p) => saveExternal.mutate(p)}
          onDelete={(id) => deleteExternal.mutate(id)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <CategoryGoals
          categoryAvg={categoryAvg}
          currentStat={monthly[selectedMonth]}
          goals={goals}
          onSaveGoal={(p) => saveGoal.mutate(p)}
        />
        <FixedExpensePanel transactions={transactions} month={selectedMonth} />
      </div>
    </main>
  );
}