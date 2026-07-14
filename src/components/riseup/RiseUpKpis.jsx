import React from 'react';
import { Card } from '@/components/ui/card';
import { fmt } from './riseupGroups';

export default function RiseUpKpis({ income, expense }) {
  const net = income - expense;
  const items = [
    { label: 'Income', value: fmt(income), cls: 'text-emerald-600' },
    { label: 'Expenses', value: fmt(expense), cls: 'text-rose-600' },
    { label: 'Net', value: (net >= 0 ? '+' : '') + fmt(net), cls: net >= 0 ? 'text-emerald-600' : 'text-rose-600' }
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(it => (
        <Card key={it.label} className="p-4 border-0 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{it.label}</p>
          <p className={`text-lg md:text-2xl font-bold ${it.cls}`}>{it.value}</p>
        </Card>
      ))}
    </div>
  );
}