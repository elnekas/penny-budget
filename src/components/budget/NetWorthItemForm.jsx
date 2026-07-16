import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NW_KINDS } from './netWorthKinds';

const inputCls = "px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full";

export default function NetWorthItemForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    kind: initial?.kind || 'cash',
    currency: initial?.currency || 'ILS',
    value: initial?.value ?? '',
    exchange_rate: initial?.exchange_rate ?? 3.7,
    notes: initial?.notes || ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    onSave({ ...form, value: Number(form.value), exchange_rate: Number(form.exchange_rate) || 3.7 });
  };

  return (
    <form onSubmit={submit} className="bg-slate-50 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Name (e.g. Leumi checking)" value={form.name} onChange={e => set('name', e.target.value)} />
        <select className={inputCls} value={form.kind} onChange={e => set('kind', e.target.value)}>
          {Object.entries(NW_KINDS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <input className={inputCls} type="number" step="any" min="0" placeholder="Value" value={form.value} onChange={e => set('value', e.target.value)} />
        <select className={inputCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
          <option value="ILS">₪ ILS</option>
          <option value="USD">$ USD</option>
        </select>
        {form.currency === 'USD' && (
          <input className={inputCls} type="number" step="0.01" placeholder="USD→ILS rate" value={form.exchange_rate} onChange={e => set('exchange_rate', e.target.value)} />
        )}
        <input className={`${inputCls} ${form.currency === 'USD' ? '' : 'col-span-2'}`} placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" className="rounded-full text-slate-500" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700">{initial ? 'Save changes' : 'Add'}</Button>
      </div>
    </form>
  );
}