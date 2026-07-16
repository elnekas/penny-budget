import React from 'react';
import { fmt } from '@/components/riseup/riseupGroups';

export default function PlannerIncomePicker({ options, selected, onToggle, budget, readOnly, title, suffix = '/mo', budgetCaption }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/60 border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title || 'Justify your budget · pick income sources'}
        </p>
        <p className="text-[11px] text-slate-400">{readOnly ? 'actuals' : '6-month averages'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && <p className="text-xs text-slate-400 py-1">No income recorded</p>}
        {options.map(o => {
          const on = readOnly || selected.includes(o.id);
          return (
            <button key={o.id} onClick={() => !readOnly && onToggle(o.id)} disabled={readOnly}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                on
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
              } ${readOnly ? 'cursor-default' : ''}`}>
              {!readOnly && (
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${on ? 'bg-white/20 border-white/40' : 'border-slate-300'}`}>
                  {on ? '✓' : ''}
                </span>
              )}
              {o.label}
              <span className={on ? 'text-emerald-100' : 'text-slate-400'}>{fmt(o.avg)}{suffix}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-800">{fmt(budget)}</span>
        <span className="text-xs text-slate-400">
          {budgetCaption || 'monthly budget backed by the selected sources'}
        </span>
      </div>
    </div>
  );
}