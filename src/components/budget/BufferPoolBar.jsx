import React, { useState } from 'react';
import { fmt } from '@/components/riseup/riseupGroups';
import { bufferPoolUSD } from './externalIncomeUtils';

const inputCls = "w-28 px-2 py-1 bg-white border border-sky-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-500/40";

export default function BufferPoolBar({ buffers, transfers, bufferDraw, onSave }) {
  const [val, setVal] = useState(null);
  if (!buffers.length) return null;
  const totalUSD = buffers.reduce((s, e) => s + e.amount_usd, 0);
  const leftUSD = Math.max(bufferPoolUSD(buffers, transfers), 0);
  const rate = buffers[0]?.exchange_rate || 3.7;
  const leftILS = leftUSD * rate;
  const monthsLeft = bufferDraw > 0 ? Math.floor(leftILS / bufferDraw) : null;

  const commit = () => {
    const n = Number(val);
    if (val !== null && !Number.isNaN(n) && n !== bufferDraw) onSave(n);
    setVal(null);
  };

  return (
    <div className="mb-3 p-3 rounded-xl bg-sky-50 border border-sky-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-sky-800">
            Pot: ${Math.round(leftUSD).toLocaleString()} left of ${Math.round(totalUSD).toLocaleString()}
            <span className="text-sky-500 font-normal"> · ≈{fmt(leftILS)}</span>
          </p>
          <p className="text-[11px] text-sky-600/80">
            {bufferDraw > 0
              ? `Drawing ${fmt(bufferDraw)}/mo as income · lasts ~${monthsLeft} more months at this pace`
              : 'Set a monthly draw to count this pool as income in your budget zone'}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-sky-700 font-medium">
          Monthly draw ₪
          <input
            className={inputCls}
            type="number"
            value={val ?? (bufferDraw || '')}
            placeholder="0"
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          />
        </label>
      </div>
    </div>
  );
}