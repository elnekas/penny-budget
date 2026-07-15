import React, { useState } from 'react';
import moment from 'moment';
import { ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { fmt } from './riseupGroups';

export default function CategoryLine({ name, amount, txs, categories, onCategoryChange, onRename }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(name);

  const submitRename = () => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== name) onRename(name, trimmed);
    setEditing(false);
  };

  return (
    <div className="rounded-lg">
      <div className="flex items-center gap-1.5 py-1 group/cat">
        <button onClick={() => setOpen(!open)} className="text-slate-300 hover:text-slate-500 shrink-0">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              dir="auto"
              className="flex-1 min-w-0 text-xs px-1.5 py-0.5 border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button onClick={submitRename} className="text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setEditing(false); setNewName(name); }} className="text-slate-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => setOpen(!open)} className="flex-1 min-w-0 flex justify-between items-center text-xs text-slate-500 text-left">
            <span className="truncate" dir="auto">{name} <span className="text-slate-300">({txs.length})</span></span>
            <span className="font-medium shrink-0 ml-2">{fmt(amount)}</span>
          </button>
        )}
        {!editing && (
          <button
            onClick={() => { setNewName(name); setEditing(true); }}
            title="Rename category"
            className="text-slate-300 hover:text-emerald-600 opacity-0 group-hover/cat:opacity-100 transition-opacity shrink-0"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="ml-5 mb-2 space-y-1 border-l border-slate-100 pl-2">
          {txs.sort((a, b) => b.amt - a.amt).map(t => (
            <div key={t.id} className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex-1 min-w-0 truncate" dir="auto">{t.name}</span>
              <span className="text-slate-400 shrink-0">{moment(t.td).format('D MMM')}</span>
              <span className="font-medium shrink-0">{fmt(t.amt)}</span>
              <select
                value={t.category}
                onChange={e => onCategoryChange(t, e.target.value)}
                title="Reassign category"
                className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 border-0 cursor-pointer max-w-[90px] shrink-0"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}