import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

export default function CategoryMultiSelect({ categories, selected, onChange }) {
  const toggle = (cat) => {
    onChange(selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat]);
  };

  const label = selected.length === 0
    ? 'All Categories'
    : selected.length === 1 ? selected[0] : `${selected.length} categories`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 max-w-[180px]">
          <span className="truncate" dir="auto">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2 max-h-80 overflow-y-auto">
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="w-full text-left text-xs text-emerald-600 font-medium px-2 py-1.5 hover:bg-emerald-50 rounded-md mb-1">
            Clear selection ({selected.length})
          </button>
        )}
        {categories.map(cat => (
          <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
            <Checkbox checked={selected.includes(cat)} onCheckedChange={() => toggle(cat)} />
            <span className="text-xs text-slate-700 truncate" dir="auto">{cat}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}