import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Globe } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';

const inputCls = "w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40";
const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };
const empty = { source_name: '', amount_usd: '', frequency: 'monthly', exchange_rate: 3.7, spend_pct: 40 };

export default function ExternalIncomeManager({ externals, onSave, onDelete }) {
  const [form, setForm] = useState(null);

  const submit = () => {
    if (!form.source_name || !form.amount_usd) return;
    onSave({
      id: form.id,
      data: {
        source_name: form.source_name,
        amount_usd: Number(form.amount_usd),
        frequency: form.frequency,
        exchange_rate: Number(form.exchange_rate) || 3.7,
        spend_pct: Number(form.spend_pct) || 0,
        active: true
      }
    });
    setForm(null);
  };

  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5"><Globe className="w-4 h-4 text-teal-500" /> Overseas Income (USD)</h3>
        <Button variant="ghost" size="sm" className="text-teal-600 h-7 px-2" onClick={() => setForm({ ...empty })}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <p className="text-xs text-slate-400 mb-3">Rent, dividends & other USD streams — split between spending and reinvestment</p>

      <div className="space-y-2">
        {externals.map(e => {
          const monthlyILS = (e.amount_usd * (e.exchange_rate || 3.7)) / (FREQ_DIV[e.frequency] || 1);
          return (
            <div key={e.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 text-sm cursor-pointer hover:bg-slate-100" onClick={() => setForm({ ...e })}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{e.source_name}</p>
                <p className="text-xs text-slate-400">${e.amount_usd.toLocaleString()} {e.frequency} · {e.spend_pct ?? 40}% to spend</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-emerald-600">{fmt(monthlyILS * ((e.spend_pct ?? 40) / 100))}/mo spend</p>
                <p className="text-teal-500">{fmt(monthlyILS * (1 - (e.spend_pct ?? 40) / 100))}/mo reinvest</p>
              </div>
              <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }} className="text-slate-300 hover:text-rose-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {externals.length === 0 && !form && (
          <p className="text-sm text-slate-400 text-center py-4">No overseas income sources yet — add your US rent & dividends</p>
        )}
      </div>

      {form && (
        <div className="mt-3 p-3 rounded-xl border border-teal-100 bg-teal-50/50 space-y-2">
          <input className={inputCls} placeholder="Source name (e.g. US Rental)" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="number" placeholder="Amount USD" value={form.amount_usd} onChange={e => setForm({ ...form, amount_usd: e.target.value })} />
            <select className={inputCls} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input className={inputCls} type="number" step="0.01" placeholder="USD→ILS rate" value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} />
            <input className={inputCls} type="number" min="0" max="100" placeholder="% to spend" value={form.spend_pct} onChange={e => setForm({ ...form, spend_pct: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={submit}>{form.id ? 'Update' : 'Add'} source</Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}