import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';
import { potRemainingUSD, potDrawUSD, actualUSDForMonth } from './externalIncomeUtils';

const inputCls = "px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40";
const currentMonth = new Date().toISOString().slice(0, 7);

export default function PotTransferTracker({ pot, transfers, candidates, onSave, onDelete }) {
  const [manual, setManual] = useState(null);
  const rate = pot.exchange_rate || 3.7;
  const mine = transfers.filter(t => t.income_id === pot.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const linkedIds = new Set(transfers.map(t => t.tx_id).filter(Boolean));
  const options = (candidates || []).filter(t => !linkedIds.has(t.id)).sort((a, b) => new Date(b.td) - new Date(a.td));
  const remaining = potRemainingUSD(pot, transfers);
  const drawUSD = potDrawUSD(pot, currentMonth, transfers);
  const actual = actualUSDForMonth(pot, currentMonth, transfers);

  const linkTx = (id) => {
    const tx = candidates.find(t => t.id === id);
    if (!tx) return;
    onSave({ income_id: pot.id, date: (tx.td || '').slice(0, 10), amount_ils: tx.amt, tx_id: tx.id, tx_name: tx.name });
  };

  return (
    <div className="mt-1 ml-3 p-3 rounded-xl border border-teal-100 bg-teal-50/40 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-600">
          This month: <b>{fmt(drawUSD * rate)}</b> (~${Math.round(drawUSD).toLocaleString()}) {actual != null ? '· actual transfer' : '· planned slice'}
        </span>
        <span className="text-slate-500 shrink-0">${Math.max(Math.round(remaining), 0).toLocaleString()} left of ${pot.amount_usd.toLocaleString()}</span>
      </div>

      {mine.map(t => (
        <div key={t.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/70">
          <span className="text-slate-500 w-20 shrink-0">{t.date}</span>
          <span className="flex-1 truncate text-slate-600">{t.tx_name || t.notes || 'Manual entry'}</span>
          <span className="font-semibold text-emerald-600">{fmt(t.amount_ils)}</span>
          <span className="text-slate-400">(~${Math.round(t.amount_ils / rate).toLocaleString()})</span>
          <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-0.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {mine.length === 0 && (
        <p className="text-slate-400">No actual transfers logged yet — each month is assumed at the planned ${Number(pot.monthly_slice_usd).toLocaleString()} slice. Log the real NIS deposits to true-up the pot.</p>
      )}

      <select className={`${inputCls} w-full`} value="" onChange={e => e.target.value && linkTx(e.target.value)}>
        <option value="">Link an actual NIS deposit from RiseUp (ignored incoming transfers)…</option>
        {options.slice(0, 50).map(t => (
          <option key={t.id} value={t.id}>{(t.td || '').slice(0, 10)} · {t.name} · {fmt(t.amt)}</option>
        ))}
      </select>

      {manual ? (
        <div className="flex items-center gap-2">
          <input className={inputCls} type="date" value={manual.date} onChange={e => setManual({ ...manual, date: e.target.value })} />
          <input className={`${inputCls} flex-1 min-w-0`} type="number" placeholder="Amount ₪" value={manual.amount_ils} onChange={e => setManual({ ...manual, amount_ils: e.target.value })} />
          <button
            className="text-teal-600 font-semibold"
            onClick={() => {
              if (!manual.date || !Number(manual.amount_ils)) return;
              onSave({ income_id: pot.id, date: manual.date, amount_ils: Number(manual.amount_ils), notes: 'Manual entry' });
              setManual(null);
            }}
          >Save</button>
          <button className="text-slate-400" onClick={() => setManual(null)}>Cancel</button>
        </div>
      ) : (
        <button className="text-teal-600 font-medium" onClick={() => setManual({ date: new Date().toISOString().slice(0, 10), amount_ils: '' })}>
          + Log a transfer manually
        </button>
      )}
    </div>
  );
}