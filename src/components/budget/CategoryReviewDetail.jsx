import React, { useState } from 'react';
import moment from 'moment';
import { fmt } from '@/components/riseup/riseupGroups';

export default function CategoryReviewDetail({ category, month, months, monthly, monthLabels, avg, goal, spent, transactions, onSaveGoal, onDeleteGoal }) {
  const [custom, setCustom] = useState('');

  const trendMonths = months.slice(-6);
  const values = trendMonths.map(m => monthly[m]?.categories?.[category] || 0);
  const max = Math.max(...values, avg, 1);

  const txs = transactions
    .filter(t => !t.inc && !t.ignored && t.m === month && t.category === category)
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 5);

  return (
    <div className="mb-3 p-3 rounded-xl bg-slate-50 space-y-3 text-xs">
      {/* Trend vs your usual */}
      <div>
        <p className="font-semibold text-slate-500 mb-1.5">Last months {avg > 0 && <span className="font-normal text-slate-400">· your usual is {fmt(avg)}/mo</span>}</p>
        <div className="space-y-1">
          {trendMonths.map((m, i) => (
            <div key={m} className="flex items-center gap-2">
              <span className={`w-14 shrink-0 ${m === month ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                {(monthLabels?.[m] || m).slice(0, 8)}
              </span>
              <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${m === month ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  style={{ width: `${Math.min((values[i] / max) * 100, 100)}%` }}
                />
              </div>
              <span className="w-16 text-right text-slate-500">{fmt(values[i])}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What's behind this month's number */}
      {txs.length > 0 && (
        <div>
          <p className="font-semibold text-slate-500 mb-1.5">Biggest purchases this month</p>
          <div className="space-y-1">
            {txs.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-slate-400">{moment(t.td).format('D MMM')}</span>
                <span className="flex-1 truncate text-slate-600" dir="auto">{t.name}</span>
                <span className="font-medium text-slate-700">{fmt(t.amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ceiling */}
      <div className="pt-1 border-t border-slate-200/70">
        {goal ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">Ceiling: <b className="text-slate-700">{fmt(goal.monthly_target)}/mo</b></span>
            <input
              type="number"
              placeholder="New amount"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <button
              className="text-emerald-600 font-semibold disabled:opacity-40"
              disabled={!Number(custom)}
              onClick={() => { onSaveGoal({ category, monthly_target: Number(custom) }); setCustom(''); }}
            >Update</button>
            <button className="text-slate-400 hover:text-rose-500" onClick={() => onDeleteGoal(goal.id)}>Remove ceiling</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">Set a ceiling:</span>
            {avg > 0 && (
              <>
                <button
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-400"
                  onClick={() => onSaveGoal({ category, monthly_target: Math.round(avg / 10) * 10 })}
                >Match my usual · {fmt(Math.round(avg / 10) * 10)}</button>
                <button
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-400"
                  onClick={() => onSaveGoal({ category, monthly_target: Math.round((avg * 0.9) / 10) * 10 })}
                >Trim 10% · {fmt(Math.round((avg * 0.9) / 10) * 10)}</button>
              </>
            )}
            <input
              type="number"
              placeholder="Custom ₪"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <button
              className="text-emerald-600 font-semibold disabled:opacity-40"
              disabled={!Number(custom)}
              onClick={() => { onSaveGoal({ category, monthly_target: Number(custom) }); setCustom(''); }}
            >Set</button>
          </div>
        )}
      </div>
    </div>
  );
}