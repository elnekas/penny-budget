import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Anchor } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';

export default function FixedExpensePanel({ transactions, month }) {
  const rows = useMemo(() => {
    const byName = {};
    transactions.forEach(t => {
      if (t.m !== month || t.inc || !t.fixed || t.ignored || t.internal) return;
      byName[t.name] = (byName[t.name] || 0) + t.amt;
    });
    return Object.entries(byName).sort((a, b) => b[1] - a[1]);
  }, [transactions, month]);

  const total = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <Card className="p-5 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-1">
        <Anchor className="w-4 h-4 text-sky-500" /> Fixed Commitments · {fmt(total)}
      </h3>
      <p className="text-xs text-slate-400 mb-3">Every shekel you free here compounds every single month — start from the top</p>
      <div className="space-y-1.5">
        {rows.slice(0, 10).map(([name, amt]) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate text-slate-600">{name}</span>
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${total ? (amt / total) * 100 : 0}%` }} />
            </div>
            <span className="w-20 text-right font-medium text-slate-700">{fmt(amt)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No fixed expenses this month</p>}
      </div>
    </Card>
  );
}