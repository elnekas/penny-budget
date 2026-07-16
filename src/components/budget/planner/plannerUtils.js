import { isInternal } from '@/components/riseup/riseupGroups';
import { isBuffer, countsInMonth, monthlyILSForMonth } from '../externalIncomeUtils';

// Last N complete months (excludes the current partial month)
export const lastFullMonths = (months, n = 6) => months.slice(0, -1).slice(-n);

// Average monthly spend per group over the given months (fixed + variable, excludes planned/ignored/internal)
export function groupAverages(transactions, avgMonths) {
  const set = new Set(avgMonths);
  const totals = {};
  transactions.forEach(t => {
    if (!set.has(t.m) || t.inc || t.ignored || t.planned || isInternal(t.name)) return;
    totals[t.group] = (totals[t.group] || 0) + t.amt;
  });
  const div = avgMonths.length || 1;
  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k] / div); });
  return totals;
}

// Selectable income sources with their 6-month monthly averages
export function incomeSourceOptions(transactions, avgMonths, externals, transfers) {
  const set = new Set(avgMonths);
  const div = avgMonths.length || 1;
  const localTotal = transactions
    .filter(t => set.has(t.m) && t.inc && !t.ignored && !isInternal(t.name))
    .reduce((s, t) => s + t.amt, 0);
  const options = [{ id: 'local', label: '🏦 Local bank income', avg: Math.round(localTotal / div) }];
  (externals || []).filter(e => !isBuffer(e)).forEach(e => {
    const total = avgMonths.reduce((s, m) =>
      countsInMonth(e, m, transfers) ? s + monthlyILSForMonth(e, m, transfers) : s, 0);
    options.push({ id: e.id, label: `🌍 ${e.source_name}`, avg: Math.round(total / div) });
  });
  return options.filter(o => o.avg > 0);
}

export const SLICE_COLORS = {
  blue:  '#3b82f6', // within 10% of average
  green: '#10b981', // trimmed >10% below average
  red:   '#ef4444', // pushed >10% above average
  gold:  '#f59e0b'  // savings gap
};

export function sliceStatus(value, avg) {
  if (!avg) return 'blue';
  const ratio = value / avg;
  if (ratio < 0.9) return 'green';
  if (ratio > 1.1) return 'red';
  return 'blue';
}