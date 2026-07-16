import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Globe, ArrowLeftRight, PiggyBank } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';
import { monthlyILSForMonth, countsInMonth, hasLanded, isPot, potRemainingUSD } from './externalIncomeUtils';
import PotTransferTracker from './PotTransferTracker';

const inputCls = "w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";
const empty = { source_name: '', amount_usd: '', frequency: 'monthly', exchange_rate: 3.7, spend_pct: 40, start_date: '', end_date: '', deposit_day: '', monthly_slice_usd: '', kind: 'income' };
const currentMonth = new Date().toISOString().slice(0, 7);

export default function ExternalIncomeManager({ externals, onSave, onDelete, transfers = [], candidates = [], onSaveTransfer, onDeleteTransfer, onToggleCashflow }) {
  const [form, setForm] = useState(null);
  const [openPot, setOpenPot] = useState(null);

  const incomes = externals.filter(e => e.kind !== 'buffer');
  const buffers = externals.filter(e => e.kind === 'buffer');

  const submit = () => {
    if (!form.source_name || !form.amount_usd) return;
    const isBuf = form.kind === 'buffer';
    const data = {
      source_name: form.source_name,
      kind: form.kind || 'income',
      amount_usd: Number(form.amount_usd),
      frequency: form.frequency,
      exchange_rate: Number(form.exchange_rate) || 3.7,
      spend_pct: isBuf ? 100 : (Number(form.spend_pct) || 0),
      monthly_slice_usd: form.frequency === 'one_time' && form.monthly_slice_usd ? Number(form.monthly_slice_usd) : null,
      active: true
    };
    if (form.start_date) data.start_date = form.start_date;
    if (form.end_date) data.end_date = form.end_date;
    if (form.deposit_day) data.deposit_day = Number(form.deposit_day);
    onSave({ id: form.id, data });
    setForm(null);
  };

  const editRow = (e) => setForm({ ...e, kind: e.kind || 'income', start_date: e.start_date || '', end_date: e.end_date || '', deposit_day: e.deposit_day || '', monthly_slice_usd: e.monthly_slice_usd || '' });

  const renderRow = (e) => {
    const buf = e.kind === 'buffer';
    const pot = !buf && isPot(e);
    const rate = e.exchange_rate || 3.7;
    const mine = buf ? transfers.filter(t => t.income_id === e.id) : [];
    const bufDrawnILS = mine.reduce((s, t) => s + (t.amount_ils || 0), 0);
    const bufMonthILS = mine.filter(t => (t.date || '').slice(0, 7) === currentMonth).reduce((s, t) => s + (t.amount_ils || 0), 0);
    const bufLeftUSD = e.amount_usd - bufDrawnILS / rate;
    const mILS = buf ? 0 : monthlyILSForMonth(e, currentMonth, transfers);
    const remaining = pot ? potRemainingUSD(e, transfers) : 0;
    const notStarted = !buf && !countsInMonth(e, currentMonth, transfers);
    const notLanded = !buf && !notStarted && !hasLanded(e, currentMonth, transfers);
    const suffix = e.frequency === 'one_time' ? (pot ? ' this mo' : '') : '/mo';
    return (
      <div key={e.id}>
        <div className={`flex items-center gap-2 p-2.5 rounded-xl text-sm cursor-pointer ${buf ? 'bg-sky-50/70 hover:bg-sky-100/70' : 'bg-slate-50 hover:bg-slate-100'} ${notStarted ? 'opacity-60' : ''}`} onClick={() => editRow(e)}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 truncate">{e.source_name}</p>
            <p className="text-xs text-slate-400">
              {buf
                ? `$${e.amount_usd.toLocaleString()} holding · ${fmt(bufDrawnILS)} drawn · $${Math.max(Math.round(bufLeftUSD), 0).toLocaleString()} left`
                : pot
                ? `$${e.amount_usd.toLocaleString()} pot · slice $${Number(e.monthly_slice_usd).toLocaleString()}/mo · $${Math.max(Math.round(remaining), 0).toLocaleString()} left`
                : `$${e.amount_usd.toLocaleString()} ${e.frequency === 'one_time' ? 'one-time' : e.frequency}`}
              {!buf && ` · ${e.spend_pct ?? 40}% to spend`}
              {e.start_date && ` · from ${e.start_date.slice(0, 7)}`}
              {e.end_date && ` · until ${e.end_date.slice(0, 7)}`}
              {e.deposit_day && ` · lands on the ${e.deposit_day}th`}
            </p>
            {notStarted && (
              <p className="text-[11px] text-amber-600 font-medium">
                {pot && remaining <= 0 ? (buf ? 'Buffer fully drawn' : 'Pot fully drawn — excluded from totals')
                  : e.end_date && e.end_date.slice(0, 7) < currentMonth ? 'Ended — excluded from totals'
                  : 'Not started yet — excluded from totals'}
              </p>
            )}
            {notLanded && <p className="text-[11px] text-slate-400">Hasn't landed yet this month</p>}
          </div>
          <div className="text-right text-xs">
            {buf ? (
              bufMonthILS > 0
                ? <p className="font-semibold text-sky-600">{fmt(bufMonthILS)} drawn this mo</p>
                : <p className="text-slate-400">no draw this mo</p>
            ) : (
              <>
                <p className="font-semibold text-emerald-600">{fmt(mILS * ((e.spend_pct ?? 40) / 100))}{suffix} spend</p>
                <p className="text-teal-500">{fmt(mILS * (1 - (e.spend_pct ?? 40) / 100))}{suffix} reinvest</p>
              </>
            )}
          </div>
          {(pot || buf) && (
            <button
              onClick={(ev) => { ev.stopPropagation(); setOpenPot(openPot === e.id ? null : e.id); }}
              className={`p-1 ${openPot === e.id ? 'text-teal-600' : 'text-slate-300 hover:text-teal-600'}`}
              title="Track actual transfers"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }} className="text-slate-300 hover:text-rose-500 p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {(pot || buf) && openPot === e.id && (
          <PotTransferTracker
            pot={e}
            transfers={transfers}
            candidates={candidates}
            onSave={onSaveTransfer}
            onDelete={onDeleteTransfer}
            onToggleCashflow={onToggleCashflow}
          />
        )}
      </div>
    );
  };

  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5"><Globe className="w-4 h-4 text-teal-500" /> Overseas Income (USD)</h3>
        <Button variant="ghost" size="sm" className="text-teal-600 h-7 px-2" onClick={() => setForm({ ...empty, kind: 'income' })}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <p className="text-xs text-slate-400 mb-3">Rent, dividends & other USD streams — split between spending and reinvestment</p>

      <div className="space-y-2">
        {incomes.map(renderRow)}
        {incomes.length === 0 && !form && (
          <p className="text-sm text-slate-400 text-center py-4">No overseas income sources yet — add your US rent & dividends</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 mb-1">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5"><PiggyBank className="w-4 h-4 text-sky-500" /> Savings Buffer (local $)</h3>
        <Button variant="ghost" size="sm" className="text-sky-600 h-7 px-2" onClick={() => setForm({ ...empty, kind: 'buffer', spend_pct: 100 })}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <p className="text-xs text-slate-400 mb-3">Holdings that affect nothing until you log an actual draw (installment) against them via the ⇄ tracker</p>

      <div className="space-y-2">
        {buffers.map(renderRow)}
        {buffers.length === 0 && !form && (
          <p className="text-sm text-slate-400 text-center py-3">No buffer accounts yet</p>
        )}
      </div>

      {form && (
        <div className={`mt-3 p-3 rounded-xl border space-y-2 ${form.kind === 'buffer' ? 'border-sky-100 bg-sky-50/50' : 'border-teal-100 bg-teal-50/50'}`}>
          <p className="text-xs font-semibold text-slate-500">{form.kind === 'buffer' ? 'Savings buffer' : 'Overseas income source'}</p>
          <input className={inputCls} placeholder={form.kind === 'buffer' ? 'Buffer name (e.g. Local USD account)' : 'Source name (e.g. US Rental)'} value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="number" placeholder="Amount USD" value={form.amount_usd} onChange={e => setForm({ ...form, amount_usd: e.target.value })} />
            <select className={inputCls} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time deposit</option>
            </select>
            {form.frequency === 'one_time' && form.kind !== 'buffer' && (
              <div className="col-span-2">
                <label className="text-[11px] text-slate-500">Monthly slice (USD, optional) — how much of this {form.kind === 'buffer' ? 'buffer to draw' : 'pot to budget as income'} each month until it runs out</label>
                <input className={inputCls} type="number" placeholder="e.g. 5000" value={form.monthly_slice_usd} onChange={e => setForm({ ...form, monthly_slice_usd: e.target.value })} />
              </div>
            )}
            <input className={inputCls} type="number" step="0.01" placeholder="USD→ILS rate" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} />
            {form.kind !== 'buffer' && (
              <input className={inputCls} type="number" min="0" max="100" placeholder="% to spend" value={form.spend_pct} onChange={e => setForm({ ...form, spend_pct: e.target.value })} />
            )}
            <div>
              <label className="text-[11px] text-slate-500">{form.frequency === 'one_time' ? 'Deposit date' : 'Started on'}</label>
              <input className={inputCls} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Ends on (optional)</label>
              <input className={inputCls} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Lands on day of month</label>
              <input className={inputCls} type="number" min="1" max="31" placeholder="e.g. 10" value={form.deposit_day} onChange={e => setForm({ ...form, deposit_day: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className={`flex-1 ${form.kind === 'buffer' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-teal-600 hover:bg-teal-700'}`} onClick={submit}>{form.id ? 'Update' : 'Add'} {form.kind === 'buffer' ? 'buffer' : 'source'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}