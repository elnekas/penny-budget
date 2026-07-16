import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { RotateCcw, Check, Loader2 } from 'lucide-react';
import { GROUPS, fmt } from '@/components/riseup/riseupGroups';
import {
  lastFullMonths, groupAverages, groupFixedAverages, groupActualsForMonth,
  incomeSourceOptions, actualIncomeOptions, futureMonthsFrom, fmtMonth,
  SLICE_COLORS, sliceStatus
} from './plannerUtils';
import PlannerIncomePicker from './PlannerIncomePicker';
import PlannerPie from './PlannerPie';
import PlannerSliceRow from './PlannerSliceRow';

const LEGEND = [
  { color: SLICE_COLORS.blue,  label: 'Within 10% of average' },
  { color: SLICE_COLORS.green, label: 'Trimmed 10%+ below' },
  { color: SLICE_COLORS.red,   label: 'Pushed 10%+ above' },
  { color: SLICE_COLORS.gold,  label: 'Savings gap' }
];

const selectCls = "px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";
const pillCls = (active) => `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`;

export default function BudgetPlannerZone({ transactions, months, externals, transfers, monthLabels }) {
  const qc = useQueryClient();
  const currentMonth = months[months.length - 1];
  const avgMonths = useMemo(() => lastFullMonths(months, 6), [months]);
  const averages = useMemo(() => groupAverages(transactions, avgMonths), [transactions, avgMonths]);
  const fixedAvg = useMemo(() => groupFixedAverages(transactions, avgMonths), [transactions, avgMonths]);
  const incomeOptions = useMemo(
    () => incomeSourceOptions(transactions, avgMonths, externals, transfers),
    [transactions, avgMonths, externals, transfers]
  );
  const monthOptions = useMemo(
    () => currentMonth ? [...months, ...futureMonthsFrom(currentMonth, 6)] : [],
    [months, currentMonth]
  );

  const plansQ = useQuery({
    queryKey: ['budget-plans'],
    queryFn: () => base44.entities.BudgetPlan.list('-created_date', 200)
  });
  const savePlan = useMutation({
    mutationFn: async ({ month, allocations, selected_sources }) => {
      const existing = (plansQ.data || []).find(p => p.month === month);
      if (existing) return base44.entities.BudgetPlan.update(existing.id, { allocations, selected_sources });
      return base44.entities.BudgetPlan.create({ month, allocations, selected_sources });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] })
  });

  const [planMonth, setPlanMonth] = useState(null);
  const [allocByMonth, setAllocByMonth] = useState({});
  const [selByMonth, setSelByMonth] = useState({});
  const [pastView, setPastView] = useState('actual');

  const month = planMonth || currentMonth;
  const mode = month < currentMonth ? 'past' : month === currentMonth ? 'current' : 'future';
  const mLabel = (m) => monthLabels?.[m] || fmtMonth(m);

  const plan = (plansQ.data || []).find(p => p.month === month);
  const alloc = useMemo(
    () => ({ ...(plan?.allocations || {}), ...(allocByMonth[month] || {}) }),
    [plan, allocByMonth, month]
  );
  const selected = selByMonth[month] ?? plan?.selected_sources ?? incomeOptions.map(o => o.id);

  const actuals = useMemo(
    () => mode === 'future' ? {} : groupActualsForMonth(transactions, month),
    [transactions, month, mode]
  );

  // Hard floor per group: fixed costs always, plus what's already spent in the live month
  const floorFor = (g) => mode === 'future'
    ? (fixedAvg[g] || 0)
    : mode === 'past'
      ? 0
      : Math.max(fixedAvg[g] || 0, actuals[g] || 0);

  const showActual = mode === 'past' && pastView === 'actual';

  const slices = useMemo(() => {
    if (showActual) {
      return Object.entries(actuals)
        .sort((x, y) => y[1] - x[1])
        .map(([g, actual]) => ({
          group: g,
          emoji: GROUPS[g]?.emoji || '',
          label: `${GROUPS[g]?.emoji || ''} ${GROUPS[g]?.label || g}`,
          value: actual,
          avg: averages[g] || 0,
          status: sliceStatus(actual, averages[g] || 0)
        }));
    }
    return Object.entries(averages)
      .sort((x, y) => y[1] - x[1])
      .map(([g, avg]) => {
        const min = floorFor(g);
        const value = Math.max(alloc[g] ?? avg, min);
        return {
          group: g,
          emoji: GROUPS[g]?.emoji || '',
          label: `${GROUPS[g]?.emoji || ''} ${GROUPS[g]?.label || g}`,
          value,
          avg,
          min,
          status: sliceStatus(value, avg)
        };
      });
  }, [averages, fixedAvg, actuals, alloc, mode, showActual]);

  const incomeShown = useMemo(
    () => showActual ? actualIncomeOptions(transactions, month, externals, transfers) : incomeOptions,
    [showActual, transactions, month, externals, transfers, incomeOptions]
  );
  const budget = showActual
    ? incomeShown.reduce((s, o) => s + o.avg, 0)
    : incomeShown.filter(o => selected.includes(o.id)).reduce((s, o) => s + o.avg, 0);

  const allocated = slices.reduce((s, x) => s + x.value, 0);
  const savings = budget - allocated;

  const setSlice = (group, value) =>
    setAllocByMonth(prev => ({ ...prev, [month]: { ...(prev[month] || {}), [group]: value } }));
  const resetAll = () =>
    setAllocByMonth(prev => ({ ...prev, [month]: Object.fromEntries(Object.keys(averages).map(g => [g, Math.max(averages[g], floorFor(g))])) }));
  const toggleSource = (id) =>
    setSelByMonth(prev => ({ ...prev, [month]: selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id] }));

  // Auto-save: persist the full plan shortly after any edit (present & future months)
  const dirty = !!(allocByMonth[month] || selByMonth[month]);
  useEffect(() => {
    if (!dirty || mode === 'past' || plansQ.isLoading) return;
    const timer = setTimeout(() => {
      savePlan.mutate({
        month,
        allocations: Object.fromEntries(slices.map(s => [s.group, s.value])),
        selected_sources: selected
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [allocByMonth, selByMonth, month]);

  if (!avgMonths.length || !Object.keys(averages).length) {
    return (
      <Card className="p-5 border-0 shadow-sm">
        <p className="py-10 text-center text-sm text-slate-400">Not enough history yet to build a budget plan</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-0 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            🎯 Budget Planning Zone
            {savePlan.isPending ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> saving…</span>
            ) : plan && !dirty && mode !== 'past' ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500"><Check className="w-3 h-3" /> saved</span>
            ) : null}
          </h3>
          <p className="text-xs text-slate-400">
            {mode === 'past' && (showActual
              ? `What actually happened in ${mLabel(month)} vs your ${avgMonths.length}-month averages`
              : `What you budgeted for ${mLabel(month)}`)}
            {mode === 'current' && `Live month — plan floors are locked at what you've already spent · auto-saves`}
            {mode === 'future' && `Planning ${mLabel(month)} against your last ${avgMonths.length}-month averages · auto-saves`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'past' && (
            <div className="flex bg-slate-50 border border-slate-200 rounded-full p-0.5">
              <button className={pillCls(pastView === 'actual')} onClick={() => setPastView('actual')}>Actual</button>
              <button className={pillCls(pastView === 'plan')} onClick={() => setPastView('plan')}>Budgeted</button>
            </div>
          )}
          <select value={month} onChange={e => setPlanMonth(e.target.value)} className={selectCls}>
            {monthOptions.map(m => (
              <option key={m} value={m}>
                {mLabel(m)}{m === currentMonth ? ' · now' : m > currentMonth ? ' · plan' : ''}
              </option>
            ))}
          </select>
          {mode !== 'past' && (
            <button onClick={resetAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 hover:text-slate-700 hover:border-slate-300 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      <PlannerIncomePicker
        options={incomeShown}
        selected={selected}
        onToggle={toggleSource}
        budget={budget}
        readOnly={mode === 'past'}
        title={showActual ? `Where the money actually came from · ${mLabel(month)}` : undefined}
        suffix={showActual ? '' : '/mo'}
        budgetCaption={showActual ? 'income that actually arrived this month' : undefined}
      />

      <div className="grid md:grid-cols-5 gap-5 mt-4">
        <div className="md:col-span-2 flex flex-col">
          <PlannerPie
            slices={slices}
            savings={savings}
            budget={budget}
            caption={showActual ? 'Income' : 'Budget'}
            savedWord={showActual ? 'kept' : 'saved'}
          />
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {LEGEND.map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="space-y-0.5 max-h-96 overflow-y-auto pr-1">
            {slices.map(s => (
              <PlannerSliceRow key={s.group} slice={s} readOnly={mode === 'past'}
                transactions={transactions} month={month} avgMonths={avgMonths}
                onChange={(v) => setSlice(s.group, v)} />
            ))}
          </div>
          <div className={`mt-3 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between ${
            savings > 0
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-100'
              : savings < 0
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            <span>
              {showActual
                ? (savings > 0 ? '✨ You actually kept this much of your income' : savings < 0 ? 'You spent more than the income that arrived' : 'Income and spend exactly balanced')
                : mode === 'past'
                  ? (savings > 0 ? '✨ This plan left this much for savings' : savings < 0 ? 'This plan exceeded the budget' : 'This plan was fully allocated')
                  : (savings > 0 ? '✨ Planned savings — the golden slice of your pie' : savings < 0 ? 'Your plan exceeds the budget — trim some slices' : 'Fully allocated — every shekel has a job')}
            </span>
            <span className="text-sm font-bold">{fmt(Math.abs(savings))}{savings < 0 ? ' over' : ''}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}