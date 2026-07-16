import React from 'react';
import moment from 'moment';
import { Eye, EyeOff, ListFilter } from 'lucide-react';
import { GROUPS, fmt } from './riseupGroups';
import { cn } from '@/lib/utils';

export default function RiseUpTransactionRow({ t, categories, onCategoryChange, onToggleIgnore, onFilterSimilar }) {
  const meta = GROUPS[t.group] || GROUPS.other;
  const handleCategory = (val) => {
    if (val === '__new__') {
      const name = window.prompt('New category name:');
      if (name && name.trim()) onCategoryChange(t, name.trim());
    } else {
      onCategoryChange(t, val);
    }
  };
  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-xl border transition-opacity",
      t.ignored ? "opacity-40 bg-slate-50 border-slate-100" : "bg-white border-slate-100"
    )}>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0", meta.chip)}>
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate text-sm" dir="auto">{t.name}</span>
          {t.possibleDuplicate && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 shrink-0">Duplicate?</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <select
            value={t.category}
            onChange={(e) => handleCategory(e.target.value)}
            className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-md border-0 cursor-pointer max-w-[140px]",
              t.hasOverride ? "bg-emerald-100 text-emerald-800 font-medium" : "bg-slate-100 text-slate-600"
            )}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">＋ New category…</option>
          </select>
          <span className="text-[11px] text-slate-400">{t.srcName}</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", t.fixed ? "bg-sky-50 text-sky-600" : "bg-slate-50 text-slate-500")}>
            {t.fixed ? 'Fixed' : 'One-off'}
          </span>
          {t.inst && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
              {t.inst.n}/{t.inst.tot}
            </span>
          )}
          {t.bd && t.bd !== t.td && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-500">
              Billed {moment(t.bd).format('D MMM')}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className={cn("font-semibold text-sm", t.inc ? "text-emerald-600" : "text-slate-800")}>
          {t.inc ? '+' : '−'}{fmt(t.amt)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">{moment(t.td).format('D MMM')}</span>
          {onFilterSimilar && (
            <button
              onClick={() => onFilterSimilar(t)}
              title="Show all instances of this item"
              className="text-slate-300 hover:text-emerald-600"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onToggleIgnore(t)}
            title={t.ignored ? 'Include in totals' : 'Ignore (exclude from totals)'}
            className="text-slate-300 hover:text-slate-600"
          >
            {t.ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}