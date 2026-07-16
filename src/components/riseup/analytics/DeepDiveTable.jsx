import React, { useMemo } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { fmt } from '@/components/riseup/riseupGroups';

const pctCell = (pct) => {
  if (pct === null) return <span className="text-slate-600">—</span>;
  const up = pct > 0;
  return (
    <span className={up ? 'text-rose-400' : 'text-emerald-400'}>
      {up ? '▲' : '▼'}{Math.abs(pct).toFixed(0)}%
    </span>
  );
};

export default function DeepDiveTable({ expenses, months, monthLabels }) {
  const { rows, showMonths, currentMonth, monthProgress, totals } = useMemo(() => {
    const showMonths = months.slice(-6);
    const currentMonth = months[months.length - 1];
    const now = moment();
    const isCurrentMonthNow = now.format('YYYY-MM') === currentMonth;
    const monthProgress = isCurrentMonthNow ? now.date() / now.daysInMonth() : 1;

    const byCat = {};
    expenses.forEach(t => {
      if (!showMonths.includes(t.m)) return;
      byCat[t.category] = byCat[t.category] || {};
      byCat[t.category][t.m] = (byCat[t.category][t.m] || 0) + t.amt;
    });

    const fullMonths = showMonths.filter(m => m !== currentMonth).slice(-3);
    const rows = Object.entries(byCat).map(([cat, vals]) => {
      const avg = fullMonths.reduce((s, m) => s + (vals[m] || 0), 0) / (fullMonths.length || 1);
      const current = vals[currentMonth] || 0;
      const projection = monthProgress > 0 ? current / monthProgress : current;
      const prev = vals[showMonths[showMonths.length - 2]] || 0;
      return { cat, vals, avg, current, projection, projVsAvg: avg > 0 ? ((projection - avg) / avg) * 100 : null, momPrev: prev };
    }).sort((a, b) => b.avg - a.avg);

    const totals = {};
    showMonths.forEach(m => { totals[m] = rows.reduce((s, r) => s + (r.vals[m] || 0), 0); });

    return { rows, showMonths, currentMonth, monthProgress, totals };
  }, [expenses, months]);

  return (
    <Card className="border-0 shadow-lg bg-slate-900 text-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-emerald-400 font-mono">▮ DEEP DIVE · CATEGORY MATRIX</h3>
        <p className="text-xs text-slate-500 font-mono">{monthLabels?.[currentMonth] || currentMonth} is {Math.round(monthProgress * 100)}% elapsed · projections extrapolated</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="text-left px-4 py-2 sticky left-0 bg-slate-900">CATEGORY</th>
              {showMonths.map(m => (
                <th key={m} className={`text-right px-3 py-2 ${m === currentMonth ? 'text-amber-400' : ''}`}>
                  {moment(m, 'YYYY-MM').format('MMM').toUpperCase()}{m === currentMonth ? '*' : ''}
                </th>
              ))}
              <th className="text-right px-3 py-2">MoM Δ</th>
              <th className="text-right px-3 py-2 text-slate-400">3M AVG</th>
              <th className="text-right px-3 py-2 text-amber-400">PROJ.</th>
              <th className="text-right px-4 py-2">vs AVG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const prev = r.vals[showMonths[showMonths.length - 2]] || 0;
              const mom = prev > 0 ? ((r.current - prev) / prev) * 100 : null;
              return (
                <tr key={r.cat} className="border-b border-slate-800/60 hover:bg-slate-800/50">
                  <td className="px-4 py-1.5 text-slate-300 sticky left-0 bg-slate-900 max-w-[160px] truncate">{r.cat}</td>
                  {showMonths.map(m => (
                    <td key={m} className={`text-right px-3 py-1.5 ${m === currentMonth ? 'text-amber-300' : 'text-slate-400'}`}>
                      {r.vals[m] ? Math.round(r.vals[m]).toLocaleString() : '·'}
                    </td>
                  ))}
                  <td className="text-right px-3 py-1.5">{pctCell(mom)}</td>
                  <td className="text-right px-3 py-1.5 text-slate-400">{Math.round(r.avg).toLocaleString()}</td>
                  <td className="text-right px-3 py-1.5 text-amber-300">{Math.round(r.projection).toLocaleString()}</td>
                  <td className="text-right px-4 py-1.5">{pctCell(r.projVsAvg)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 text-slate-100 font-semibold">
              <td className="px-4 py-2 sticky left-0 bg-slate-900">TOTAL</td>
              {showMonths.map(m => (
                <td key={m} className={`text-right px-3 py-2 ${m === currentMonth ? 'text-amber-300' : ''}`}>
                  {Math.round(totals[m]).toLocaleString()}
                </td>
              ))}
              <td colSpan={2} />
              <td className="text-right px-3 py-2 text-amber-300">
                {Math.round(rows.reduce((s, r) => s + r.projection, 0)).toLocaleString()}
              </td>
              <td className="text-right px-4 py-2 text-slate-500">₪</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-slate-500 font-mono border-t border-slate-800">* current partial month · PROJ. = end-of-month projection at current pace · all values ₪</p>
    </Card>
  );
}