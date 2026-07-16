import React from 'react';
import { fmt } from '@/components/riseup/riseupGroups';
import { SLICE_COLORS } from './plannerUtils';

export default function PlannerSliceRow({ slice, onChange }) {
  const { label, value, avg, status } = slice;
  const color = SLICE_COLORS[status];
  const max = Math.max(Math.round(avg * 2), value, 500);
  const deltaPct = avg ? Math.round((value / avg - 1) * 100) : 0;

  return (
    <div className="group rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={{ background: color }} />
        <span className="flex-1 min-w-0 truncate font-medium text-slate-700">{label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors"
          style={{ background: color + '1a', color }}>
          {deltaPct === 0 ? 'avg' : `${deltaPct > 0 ? '+' : ''}${deltaPct}%`}
        </span>
        <span className="text-slate-400 w-14 text-right">avg {fmt(avg)}</span>
        <span className="font-bold w-16 text-right tabular-nums" style={{ color }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={50}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-slate-100"
        style={{ accentColor: color }}
      />
    </div>
  );
}