import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import { fmt } from '@/components/riseup/riseupGroups';
import CategoryReviewDetail from './CategoryReviewDetail';

function verdict(spent, avg, goal) {
  if (goal) {
    const pct = spent / goal.monthly_target;
    if (pct > 1) return { text: `${fmt(spent - goal.monthly_target)} over ceiling`, tone: 'text-rose-600' };
    if (pct > 0.85) return { text: `${Math.round(pct * 100)}% of ceiling`, tone: 'text-amber-600' };
    return { text: `on track · ${Math.round(pct * 100)}% of ceiling`, tone: 'text-emerald-600' };
  }
  if (!avg) return { text: 'no history yet', tone: 'text-slate-400' };
  const diff = spent - avg;
  if (diff > avg * 0.15 && diff > 100) return { text: `${fmt(diff)} above your usual`, tone: 'text-amber-600' };
  if (diff < -avg * 0.15 && diff < -100) return { text: `${fmt(-diff)} below your usual`, tone: 'text-emerald-600' };
  return { text: 'typical for you', tone: 'text-slate-400' };
}

export default function SpendingReview({ month, monthLabel, months, monthly, monthLabels, categoryAvg, goals, transactions, onSaveGoal, onDeleteGoal }) {
  const [open, setOpen] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const current = monthly[month]?.categories || {};
  const goalMap = Object.fromEntries(goals.map(g => [g.category, g]));
  const cats = Array.from(new Set([...Object.keys(categoryAvg), ...Object.keys(current), ...Object.keys(goalMap)]))
    .map(c => {
      const spent = current[c] || 0;
      const avg = categoryAvg[c] || 0;
      const goal = goalMap[c];
      // attention = how far off "normal" this category is right now
      const attention = goal ? spent - goal.monthly_target : spent - avg;
      return { c, spent, avg, goal, attention, v: verdict(spent, avg, goal) };
    })
    .filter(r => r.spent > 0 || r.avg > 0 || r.goal)
    .sort((a, b) => b.attention - a.attention);

  const visible = showAll ? cats : cats.slice(0, 8);

  return (
    <Card className="p-5 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-1">
        <Target className="w-4 h-4 text-emerald-500" /> Spending Review · {monthLabel}
      </h3>
      <p className="text-xs text-slate-400 mb-3">Sorted by what needs your attention — tap a category to see why, and set a ceiling only if it earns one</p>

      <div className="divide-y divide-slate-100">
        {visible.map(({ c, spent, avg, goal, v }) => (
          <div key={c}>
            <button
              className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-2 -mx-2"
              onClick={() => setOpen(open === c ? null : c)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate" dir="auto">
                  {c}
                  {goal && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold align-middle">ceiling {fmt(goal.monthly_target)}</span>}
                </p>
                <p className={`text-xs ${v.tone}`}>{v.text}</p>
              </div>
              <span className="text-sm font-semibold text-slate-800 shrink-0">{fmt(spent)}</span>
              {open === c ? <ChevronUp className="w-4 h-4 text-slate-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />}
            </button>
            {open === c && (
              <CategoryReviewDetail
                category={c}
                month={month}
                months={months}
                monthly={monthly}
                monthLabels={monthLabels}
                avg={avg}
                goal={goal}
                spent={spent}
                transactions={transactions}
                onSaveGoal={onSaveGoal}
                onDeleteGoal={onDeleteGoal}
              />
            )}
          </div>
        ))}
        {cats.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No variable spending yet this month</p>}
      </div>

      {cats.length > 8 && (
        <button className="mt-2 text-xs text-emerald-600 font-medium" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all ${cats.length} categories`}
        </button>
      )}
    </Card>
  );
}