import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import { GROUPS, fmt } from '@/components/riseup/riseupGroups';
import { lastFullMonths, groupAverages, incomeSourceOptions, SLICE_COLORS, sliceStatus } from './plannerUtils';
import PlannerIncomePicker from './PlannerIncomePicker';
import PlannerPie from './PlannerPie';
import PlannerSliceRow from './PlannerSliceRow';

const LEGEND = [
  { color: SLICE_COLORS.blue,  label: 'Within 10% of average' },
  { color: SLICE_COLORS.green, label: 'Trimmed 10%+ below' },
  { color: SLICE_COLORS.red,   label: 'Pushed 10%+ above' },
  { color: SLICE_COLORS.gold,  label: 'Savings gap' }
];

export default function BudgetPlannerZone({ transactions, months, externals, transfers }) {
  const avgMonths = useMemo(() => lastFullMonths(months, 6), [months]);
  const averages = useMemo(() => groupAverages(transactions, avgMonths), [transactions, avgMonths]);
  const incomeOptions = useMemo(
    () => incomeSourceOptions(transactions, avgMonths, externals, transfers),
    [transactions, avgMonths, externals, transfers]
  );

  const [selected, setSelected] = useState(null); // null until options load
  const [alloc, setAlloc] = useState(null);

  useEffect(() => {
    if (selected === null && incomeOptions.length) setSelected(incomeOptions.map(o => o.id));
  }, [incomeOptions, selected]);
  useEffect(() => {
    if (alloc === null && Object.keys(averages).length) setAlloc({ ...averages });
  }, [averages, alloc]);

  const budget = incomeOptions.filter(o => (selected || []).includes(o.id)).reduce((s, o) => s + o.avg, 0);

  const slices = useMemo(() => {
    const a = alloc || averages;
    return Object.entries(averages)
      .sort((x, y) => y[1] - x[1])
      .map(([g, avg]) => {
        const value = a[g] ?? avg;
        return {
          group: g,
          label: `${GROUPS[g]?.emoji || ''} ${GROUPS[g]?.label || g}`,
          value,
          avg,
          status: sliceStatus(value, avg)
        };
      });
  }, [averages, alloc]);

  const allocated = slices.reduce((s, x) => s + x.value, 0);
  const savings = budget - allocated;

  const setSlice = (group, value) => setAlloc(prev => ({ ...(prev || averages), [group]: value }));
  const resetAll = () => setAlloc({ ...averages });
  const toggleSource = (id) => setSelected(sel => (sel || []).includes(id) ? sel.filter(s => s !== id) : [...(sel || []), id]);

  if (!avgMonths.length || !slices.length) {
    return (
      <Card className="p-5 border-0 shadow-sm">
        <p className="py-10 text-center text-sm text-slate-400">Not enough history yet to build a budget plan</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-0 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">🎯 Budget Planning Zone</h3>
          <p className="text-xs text-slate-400">Sculpt next month's spend against your last {avgMonths.length}-month averages</p>
        </div>
        <button onClick={resetAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 hover:text-slate-700 hover:border-slate-300 transition-colors">
          <RotateCcw className="w-3 h-3" /> Reset to averages
        </button>
      </div>

      <PlannerIncomePicker options={incomeOptions} selected={selected || []} onToggle={toggleSource} budget={budget} />

      <div className="grid md:grid-cols-5 gap-5 mt-4">
        <div className="md:col-span-2 flex flex-col">
          <PlannerPie slices={slices} savings={savings} budget={budget} />
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
          <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
            {slices.map(s => (
              <PlannerSliceRow key={s.group} slice={s} onChange={(v) => setSlice(s.group, v)} />
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
              {savings > 0 && <>✨ Planned savings — the golden slice of your pie</>}
              {savings < 0 && <>Your plan exceeds the budget — trim some slices</>}
              {savings === 0 && <>Fully allocated — every shekel has a job</>}
            </span>
            <span className="text-sm font-bold">{fmt(Math.abs(savings))}{savings < 0 ? ' over' : ''}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}