import React from 'react';
import { ArrowUpDown } from 'lucide-react';

const cls = "px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer";

export default function RiseUpListControls({ flow, onFlowChange, category, onCategoryChange, categories, sortBy, onSortChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={flow} onChange={e => onFlowChange(e.target.value)} className={cls}>
        <option value="all">Expenses + Income</option>
        <option value="expense">Expenses only</option>
        <option value="income">Income only</option>
      </select>
      <select value={category} onChange={e => onCategoryChange(e.target.value)} className={cls}>
        <option value="all">All Categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="relative">
        <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <select value={sortBy} onChange={e => onSortChange(e.target.value)} className={cls + " pl-8"}>
          <option value="amount_desc">Amount: high → low</option>
          <option value="amount_asc">Amount: low → high</option>
          <option value="date_desc">Date: newest first</option>
          <option value="date_asc">Date: oldest first</option>
          <option value="name_asc">Name: A → Z</option>
        </select>
      </div>
    </div>
  );
}