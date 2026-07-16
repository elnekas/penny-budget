import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

export default function AccountMultiSelect({ accounts, overseasSources, selected, onChange }) {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const labelFor = (val) => val.startsWith('ext:')
    ? '🌍 ' + (overseasSources.find(s => 'ext:' + s.id === val)?.source_name || 'Overseas')
    : val;

  const label = selected.length === 0
    ? 'All Accounts'
    : selected.length === 1 ? labelFor(selected[0]) : `${selected.length} accounts`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
          <span className="truncate" dir="auto">{label}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2 max-h-80 overflow-y-auto">
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="w-full text-left text-xs text-emerald-600 font-medium px-2 py-1.5 hover:bg-emerald-50 rounded-md mb-1">
            Clear — show all ({selected.length} selected)
          </button>
        )}
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2 pt-1 pb-0.5">Bank accounts</p>
        {accounts.map(a => (
          <label key={a} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
            <Checkbox checked={selected.includes(a)} onCheckedChange={() => toggle(a)} />
            <span className="text-xs text-slate-700 truncate" dir="auto">{a}</span>
          </label>
        ))}
        {overseasSources.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2 pt-2 pb-0.5">Overseas income</p>
            {overseasSources.map(s => (
              <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={selected.includes('ext:' + s.id)} onCheckedChange={() => toggle('ext:' + s.id)} />
                <span className="text-xs text-slate-700 truncate" dir="auto">🌍 {s.source_name}</span>
              </label>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}