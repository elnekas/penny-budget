import React from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { fmt, groupForCategory, GROUPS } from '@/components/riseup/riseupGroups';

export default function CategoryGoals({ categoryAvg, currentStat, goals, onSaveGoal }) {
  const goalMap = new Map(goals.map(g => [g.category, g.monthly_target]));
  const rows = Object.entries(categoryAvg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <Card className="p-5 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-800 text-sm mb-1">Variable Spending Goals</h3>
      <p className="text-xs text-slate-400 mb-4">Set a realistic ceiling per category — based on your 3-month average</p>
      <div className="space-y-4">
        {rows.map(([cat, avg]) => {
          const target = goalMap.get(cat) ?? Math.round(avg / 50) * 50;
          const spent = currentStat?.categories?.[cat] || 0;
          const pct = target > 0 ? Math.min(100, (spent / target) * 100) : 0;
          const over = spent > target;
          const g = GROUPS[groupForCategory(cat, false)];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">{g?.emoji} {cat}</span>
                <span className={over ? 'text-rose-500 font-semibold' : 'text-slate-500'}>
                  {fmt(spent)} / {fmt(target)} <span className="text-slate-300">· avg {fmt(avg)}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <Slider
                defaultValue={[target]}
                max={Math.max(500, Math.ceil(avg * 2 / 100) * 100)}
                step={50}
                onValueCommit={([v]) => onSaveGoal({ category: cat, monthly_target: v })}
                className="py-1"
              />
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No variable spending data yet</p>}
      </div>
    </Card>
  );
}