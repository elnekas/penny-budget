import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';

export default function FreedomGaugeExplainer({ localIncome, externalSpend, fixed, spent, disposable, remaining }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        <HelpCircle className="w-3.5 h-3.5" />
        How is this calculated?
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 space-y-2 leading-relaxed">
          <p>
            The Freedom Gauge answers one question: <b>how much can you still freely spend this month?</b>
          </p>
          <div className="space-y-1 font-mono text-[11px] bg-white rounded-lg p-2.5 border border-slate-100">
            <p className="flex justify-between"><span>Local income (salary etc.)</span><span>{fmt(localIncome)}</span></p>
            <p className="flex justify-between"><span>+ Overseas spendable slice</span><span>{fmt(externalSpend)}</span></p>
            <p className="flex justify-between"><span>− Fixed expenses</span><span>−{fmt(fixed)}</span></p>
            <p className="flex justify-between border-t border-slate-100 pt-1"><span>= Disposable budget</span><span>{fmt(disposable)}</span></p>
            <p className="flex justify-between"><span>− Variable spent so far</span><span>−{fmt(spent)}</span></p>
            <p className="flex justify-between border-t border-slate-100 pt-1 font-semibold"><span>= Left to spend</span><span>{fmt(remaining)}</span></p>
          </div>
          <ul className="space-y-1 list-disc pl-4 text-slate-500">
            <li><b>Local income</b> — money coming into your bank this month (ignored/internal transfers excluded).</li>
            <li><b>Overseas spendable</b> — for each active overseas source, its monthly USD amount is converted to ILS at your set exchange rate, then only your "spend %" of it counts here; the rest goes to reinvestment. One-time pots count via their monthly slice or actual logged transfers. Buffers only count when you log a draw.</li>
            <li><b>Fixed expenses</b> — recurring commitments (rent, insurance, subscriptions) that repeat every month.</li>
            <li><b>Variable spent</b> — everything else you spent this month: groceries, dining, shopping. Planned one-offs you've toggled are excluded and tally against savings instead.</li>
          </ul>
          <p className="text-slate-500">
            The bar shows how much of the disposable budget you've used ({disposable > 0 ? Math.min(100, Math.round((spent / disposable) * 100)) : 100}%). Green = still money left; red = you've spent more than the budget.
          </p>
        </div>
      )}
    </div>
  );
}