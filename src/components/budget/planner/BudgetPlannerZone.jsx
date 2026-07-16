import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
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

export default function BudgetPlannerZone({ transactions, months, externals, transfers, monthLabels }) {
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

  const [planMonth, setPlanMonth] = useState(null);
  const [selected, setSelected] = useState(null);
  const [allocByMonth, setAllocByMonth] = useState({});

  useEffect(() => {
    if (selected === null && incomeOptions.length) setSelected(incomeOptions.map(o => o.id));
  }, [incomeOptions, selected]);

  const month = planMonth || currentMonth;
  const mode = month < currentMonth ? 'past' : month === currentMonth ? 'current' : 'future';
  const mLabel = (m) => monthLabels?.[m] || fmtMonth(m);

  const actuals = useMemo(
    () => mode === 'future' ? {} : groupActualsForMonth(transactions, month),
    [transactions, month, mode]
  );

  // Hard floor per group: fixed costs always, plus what's already spent in the live month
  const floorFor = (g) => mode === 'future'
    ? (fixedAvg[g] || 0)
    : Math.max(fixedAvg[g] || 0, actuals[g] || 0);

  const alloc = allocByMonth[month];

  const slices = useMemo(() => {
    if (mode === 'past') {
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
        const value = Math.max(alloc?.[g] ?? avg, min);
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
  }, [averages, fixedAvg, actuals, alloc, mode]);

  const incomeShown = useMemo(
    () => mode === 'past' ? actualIncomeOptions(transactions, month, externals, transfers) : incomeOptions,
    [mode, transactions, month, externals, transfers, incomeOptions]
  );
  const budget = mode === 'past'
    ? incomeShown.reduce((s, o) => s + o.avg, 0)
    : incomeShown.filter(o => (selected || []).includes(o.id)).reduce((s, o) => s + o.avg, 0);

  const allocated = slices.reduce((s, x) => s + x.value, 0);
  const savings = budget - allocated;

  const setSlice = (group, value) =>
    setAllocByMonth(prev => ({ ...prev, [month]: { ...(prev[month] || {}), [group]: value } }));
  const resetAll = () =>
    setAllocByMonth(prev => ({ ...prev, [month]: {} }));
  const toggleSource = (id) =>
    setSelected(sel => (sel || []).includes(id) ? sel.filter(s => s !== id) : [...(sel || []), id]);

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
          <h3 className="font-semibold text-slate-800 text-sm">🎯 Budget Planning Zone</h3>
          <p className="text-xs text-slate-400">
            {mode === 'past' && `What actually happened in ${mLabel(month)} vs your ${avgMonths.length}-month averages`}
            {mode === 'current' && `Live month — plan floors are locked at what you've already spent`}
            {mode === 'future' && `Planning ${mLabel(month)} against your last ${avgMonths.length}-month averages`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        selected={selected || []}
        onToggle={toggleSource}
        budget={budget}
        readOnly={mode === 'past'}
        title={mode === 'past' ? `Where the money actually came from · ${mLabel(month)}` : undefined}
        suffix={mode === 'past' ? '' : '/mo'}
        budgetCaption={mode === 'past' ? 'income that actually arrived this month' : undefined}
      />

      <div className="grid md:grid-cols-5 gap-5 mt-4">
        <div className="md:col-span-2 flex flex-col">
          <PlannerPie
            slices={slices}
            savings={savings}
            budget={budget}
            caption={mode === 'past' ? 'Income' : 'Budget'}
            savedWord={mode === 'past' ? 'kept' : 'saved'}
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
              {mode === 'past'
                ? (savings > 0 ? '✨ You actually kept this much of your income' : savings < 0 ? 'You spent more than the income that arrived' : 'Income and spend exactly balanced')
                : (savings > 0 ? '✨ Planned savings — the golden slice of your pie' : savings < 0 ? 'Your plan exceeds the budget — trim some slices' : 'Fully allocated — every shekel has a job')}
            </span>
            <span className="text-sm font-bold">{fmt(Math.abs(savings))}{savings < 0 ? ' over' : ''}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}