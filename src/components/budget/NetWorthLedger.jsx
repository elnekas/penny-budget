import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';
import { NW_KINDS, itemILS, signedILS } from './netWorthKinds';
import NetWorthItemForm from './NetWorthItemForm';

export default function NetWorthLedger() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const { data: items = [] } = useQuery({
    queryKey: ['networth-items'],
    queryFn: () => base44.entities.NetWorthItem.list('-created_date', 200)
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['networth-items'] });
  const save = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities.NetWorthItem.update(id, data) : base44.entities.NetWorthItem.create(data),
    onSuccess: () => { invalidate(); setEditing(null); }
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.NetWorthItem.delete(id),
    onSuccess: invalidate
  });

  const { total, assets, debts, groups } = useMemo(() => {
    const g = {};
    let a = 0, d = 0;
    items.forEach(i => {
      (g[i.kind] = g[i.kind] || []).push(i);
      if (i.kind === 'debt') d += itemILS(i); else a += itemILS(i);
    });
    const order = Object.keys(NW_KINDS).filter(k => g[k]);
    return { total: a - d, assets: a, debts: d, groups: order.map(k => ({ kind: k, items: g[k].sort((x, y) => itemILS(y) - itemILS(x)) })) };
  }, [items]);

  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-slate-800 text-sm flex-1">🏛️ Net Worth Ledger</h3>
        <Button size="sm" variant="outline" className="rounded-full gap-1 text-slate-600 border-slate-200" onClick={() => setEditing('new')}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="flex items-baseline gap-4 mb-4">
        <span className={`text-2xl font-bold ${total >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{fmt(total)}</span>
        <span className="text-xs text-slate-400">assets {fmt(assets)}{debts > 0 && <> · debts −{fmt(debts)}</>}</span>
      </div>

      {editing === 'new' && (
        <div className="mb-3">
          <NetWorthItemForm onSave={(data) => save.mutate({ data })} onCancel={() => setEditing(null)} />
        </div>
      )}

      {items.length === 0 && editing !== 'new' && (
        <p className="py-8 text-center text-sm text-slate-400">Add your accounts, investments, property and debts to see your full picture</p>
      )}

      <div className="space-y-4">
        {groups.map(({ kind, items: list }) => {
          const meta = NW_KINDS[kind];
          const sub = list.reduce((s, i) => s + signedILS(i), 0);
          return (
            <div key={kind}>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5">
                <span>{meta.emoji} {meta.label}</span>
                <span className="flex-1 border-t border-slate-100" />
                <span className={kind === 'debt' ? 'text-rose-500' : 'text-slate-600'}>{kind === 'debt' ? '−' : ''}{fmt(Math.abs(sub))}</span>
              </div>
              <div className="space-y-1">
                {list.map(i => (
                  editing?.id === i.id ? (
                    <NetWorthItemForm key={i.id} initial={i} onSave={(data) => save.mutate({ id: i.id, data })} onCancel={() => setEditing(null)} />
                  ) : (
                    <div key={i.id} className="group flex items-center gap-2 text-sm py-1">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="flex-1 min-w-0 truncate text-slate-700" dir="auto">
                        {i.name}
                        {i.currency === 'USD' && <span className="text-[10px] text-slate-400 ml-1.5">${Math.round(i.value).toLocaleString()} @ {i.exchange_rate || 3.7}</span>}
                        {i.notes && <span className="text-[10px] text-slate-400 ml-1.5">· {i.notes}</span>}
                      </span>
                      <span className={`font-medium ${kind === 'debt' ? 'text-rose-500' : 'text-slate-700'}`}>{kind === 'debt' ? '−' : ''}{fmt(itemILS(i))}</span>
                      <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-slate-300 hover:text-slate-600" onClick={() => setEditing(i)}><Pencil className="w-3.5 h-3.5" /></button>
                        <button className="text-slate-300 hover:text-rose-500" onClick={() => remove.mutate(i.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}