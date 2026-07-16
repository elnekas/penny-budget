import React from 'react';
import { Card } from '@/components/ui/card';
import { fmt } from '@/components/riseup/riseupGroups';

export default function FreedomGauge({ stat, externalSpend, externalReinvest, label }) {
  const totalIncome = (stat?.income || 0) + externalSpend;
  const fixed = stat?.fixed || 0;
  const disposable = totalIncome - fixed;
  const spent = stat?.variable || 0;
  const remaining = disposable - spent;
  const pct = disposable > 0 ? Math.min(100, (spent / disposable) * 100) : 100;
  const ok = remaining >= 0;

  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800 text-sm">Freedom Gauge · {label}</h3>
        <span className={`text-xs font-medium ${ok ? 'text-emerald-600' : 'text-rose-500'}`}>
          {ok ? 'On track' : 'Over budget'}
        </span>
      </div>
      <p className={`text-3xl font-bold ${ok ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(remaining)}</p>
      <p className="text-xs text-slate-400 mb-3">left to spend this month after fixed commitments</p>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden mb-4">
        <div className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400">Local income</p><p className="font-semibold text-slate-700">{fmt(stat?.income || 0)}</p></div>
        <div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400">Overseas (spendable)</p><p className="font-semibold text-slate-700">{fmt(externalSpend)}</p></div>
        <div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400">Fixed expenses</p><p className="font-semibold text-slate-700">-{fmt(fixed)}</p></div>
        <div className="p-2 rounded-lg bg-slate-50"><p className="text-slate-400">Variable spent</p><p className="font-semibold text-slate-700">-{fmt(spent)}</p></div>
      </div>
      {externalReinvest > 0 && (
        <p className="mt-3 text-xs text-teal-600 bg-teal-50 rounded-lg px-3 py-2">
          💎 Plus {fmt(externalReinvest)}/month flowing into reinvestment — your wealth engine.
        </p>
      )}
    </Card>
  );
}