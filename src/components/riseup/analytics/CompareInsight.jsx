import React from 'react';
import { Lightbulb } from 'lucide-react';
import { fmt } from '../riseupGroups';
import { pearson } from './analyticsUtils';

export default function CompareInsight({ nameA, nameB, pairs }) {
  const rows = pairs.filter(p => p.a > 0 || p.b > 0);
  if (rows.length < 4) return null;

  const r = pearson(rows.map(p => p.a), rows.map(p => p.b));

  // Split months into low-A vs high-A halves and compare average B
  const sorted = [...rows].sort((x, y) => x.a - y.a);
  const half = Math.floor(sorted.length / 2);
  const avgB = arr => arr.reduce((s, p) => s + p.b, 0) / arr.length;
  const bLow = avgB(sorted.slice(0, half));
  const bHigh = avgB(sorted.slice(sorted.length - half));
  const diff = bLow - bHigh;
  const pct = bHigh > 50 ? Math.round(Math.abs(diff) / bHigh * 100) : null;

  let relation = null;
  if (r !== null) {
    const strength = Math.abs(r) >= 0.6 ? 'strong' : Math.abs(r) >= 0.3 ? 'moderate' : 'weak';
    relation = r < 0
      ? `There's a ${strength} inverse relationship — when ${nameA} goes up, ${nameB} tends to go down.`
      : `There's a ${strength} link — ${nameA} and ${nameB} tend to rise and fall together.`;
  }

  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex gap-2.5">
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-900 space-y-1">
        <p>
          In your {half} lowest-<strong>{nameA}</strong> months, you averaged <strong>{fmt(bLow)}</strong> on <strong>{nameB}</strong> —{' '}
          <strong>{fmt(Math.abs(diff))}{pct !== null ? ` (${pct}%)` : ''} {diff >= 0 ? 'more' : 'less'}</strong> than in your highest-{nameA} months.
        </p>
        {relation && <p className="text-amber-700">{relation}</p>}
        <p className="text-amber-600/70 text-[10px]">Based on {rows.length} full months (current month excluded).</p>
      </div>
    </div>
  );
}