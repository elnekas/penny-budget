import React from 'react';
import { fmt } from '@/components/riseup/riseupGroups';
import { SLICE_COLORS } from './plannerUtils';

export default function PlannerSliceRow({ slice, onChange, readOnly }) {
  const { label, value, avg, status, min = 0 } = slice;
  const color = SLICE_COLORS[status];
  const max = Math.max(Math.round(avg * 2), value, 500);
  const deltaPct = avg ? Math.round((value / avg - 1) * 100) : 0;

  return (
    <div className="group rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={{ background: color }} />
        <span className="flex-1 min-w-0 truncate font-medium text-slate-700">{label}</span>
        {min > 0 && !readOnly && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap" title="Hard floor — fixed costs / already spent">
            🔒 {fmt(min)}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors"
          style={{ background: color + '1a', color }}>
          {avg === 0 ? 'new' : deltaPct === 0 ? 'avg' : `${deltaPct > 0 ? '+' : ''}${deltaPct}%`}
        </span>
        <span className="text-slate-400 w-14 text-right">avg {fmt(avg)}</span>
        <span className="font-bold w-16 text-right tabular-nums" style={{ color }}>{fmt(value)}</span>
      </div>
      {readOnly ? (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${max ? Math.min(value / max * 100, 100) : 0}%`, background: color }} />
        </div>
      ) : (
        <div className="relative">
          {min > 0 && (
            <div className="absolute top-0 left-0 h-1.5 rounded-l-full bg-slate-300/60 pointer-events-none z-10"
              style={{ width: `${Math.min(min / max * 100, 100)}%` }} />
          )}
          <input
            type="range"
            min={0}
            max={max}
            step={50}
            value={value}
            onChange={e => onChange(Math.max(min, Number(e.target.value)))}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-slate-100 relative"
            style={{ accentColor: color }}
          />
        </div>
      )}
    </div>
  );
}