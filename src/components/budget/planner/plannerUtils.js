import { bufferMonthlyILSForMonth } from '../externalIncomeUtils';

// Last N complete months (excludes the current partial month)
export const lastFullMonths = (months, n = 6) => months.slice(0, -1).slice(-n);

const countable = (t) => !t.inc && !t.ignored && !t.planned && !t.internal;

// Average monthly spend per group over the given months (fixed + variable)
export function groupAverages(transactions, avgMonths, { fixedOnly = false } = {}) {
  const set = new Set(avgMonths);
  const totals = {};
  transactions.forEach(t => {
    if (!set.has(t.m) || !countable(t)) return;
    if (fixedOnly && !t.fixed) return;
    totals[t.group] = (totals[t.group] || 0) + t.amt;
  });
  const div = avgMonths.length || 1;
  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k] / div); });
  return totals;
}

// Average monthly FIXED spend per group — the hard floor for any plan
export const groupFixedAverages = (transactions, avgMonths) =>
  groupAverages(transactions, avgMonths, { fixedOnly: true });

// Recurring fixed items (by name) not yet charged in the given month.
// Returns { [group]: { total, items: [{ name, amt }] } } — the single source of truth
// used by both the plan floors and the per-group detail dropdown.
export function expectedFixedByGroup(transactions, month, avgMonths) {
  const set = new Set(avgMonths);
  const minMonths = Math.max(2, Math.ceil(avgMonths.length / 2));
  const spentByGroup = {};
  transactions.forEach(t => {
    if (t.m !== month || !countable(t)) return;
    (spentByGroup[t.group] = spentByGroup[t.group] || new Set()).add(t.name);
  });
  const agg = {};
  transactions.forEach(t => {
    if (!set.has(t.m) || !t.fixed || !countable(t)) return;
    const g = agg[t.group] = agg[t.group] || {};
    const e = g[t.name] = g[t.name] || { total: 0, months: new Set() };
    e.total += t.amt;
    e.months.add(t.m);
  });
  const out = {};
  Object.entries(agg).forEach(([group, names]) => {
    const items = Object.entries(names)
      .filter(([name, v]) => !(spentByGroup[group]?.has(name)) && v.months.size >= minMonths)
      .map(([name, v]) => ({ name, amt: Math.round(v.total / v.months.size) }))
      .sort((a, b) => b.amt - a.amt);
    out[group] = { total: items.reduce((s, i) => s + i.amt, 0), items };
  });
  return out;
}

// Actual spend per group in one specific month
export function groupActualsForMonth(transactions, month) {
  const totals = {};
  transactions.forEach(t => {
    if (t.m !== month || !countable(t)) return;
    totals[t.group] = (totals[t.group] || 0) + t.amt;
  });
  Object.keys(totals).forEach(k => { totals[k] = Math.round(totals[k]); });
  return totals;
}

// Income transactions linked to a pot/buffer transfer are counted via the buffer, not as local income
const linkedTxIds = (transfers) => new Set((transfers || []).map(t => t.tx_id).filter(Boolean));

// Selectable income sources: local bank income + the savings buffer monthly draw
// (overseas income feeds the USD buffer pool, so it's represented by the draw — not listed separately)
export function incomeSourceOptions(transactions, avgMonths, externals, transfers, bufferDraw = 0) {
  const set = new Set(avgMonths);
  const div = avgMonths.length || 1;
  const linked = linkedTxIds(transfers);
  const localTotal = transactions
    .filter(t => set.has(t.m) && t.inc && !t.ignored && !t.internal && !linked.has(t.id))
    .reduce((s, t) => s + t.amt, 0);
  const options = [{ id: 'local', label: '🏦 Local bank income', avg: Math.round(localTotal / div) }];
  if (bufferDraw > 0) options.push({ id: 'buffer', label: '💵 Savings buffer draw', avg: Math.round(bufferDraw) });
  return options.filter(o => o.avg > 0);
}

// What income actually arrived in one specific month, per source
export function actualIncomeOptions(transactions, month, externals, transfers) {
  const linked = linkedTxIds(transfers);
  const localTotal = transactions
    .filter(t => t.m === month && t.inc && !t.ignored && !t.internal && !linked.has(t.id))
    .reduce((s, t) => s + t.amt, 0);
  const options = [];
  if (localTotal > 0) options.push({ id: 'local', label: '🏦 Local bank income', avg: Math.round(localTotal) });
  const buf = Math.round(bufferMonthlyILSForMonth(externals, month, transfers));
  if (buf > 0) options.push({ id: 'buffer', label: '💵 Savings buffer draw', avg: buf });
  return options;
}

export const fmtMonth = (m) =>
  new Date(m + '-01T00:00:00').toLocaleString('en', { month: 'short', year: 'numeric' });

// The N months after the given 'YYYY-MM' month
export function futureMonthsFrom(month, n = 6) {
  const out = [];
  let [y, mo] = month.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    mo++; if (mo > 12) { mo = 1; y++; }
    out.push(`${y}-${String(mo).padStart(2, '0')}`);
  }
  return out;
}

export const SLICE_COLORS = {
  blue:  '#3b82f6', // within 10% of average
  green: '#10b981', // trimmed >10% below average
  red:   '#a855f7', // pushed >10% above average (purple — informative, not guilt-inducing)
  gold:  '#f59e0b'  // savings gap
};

export function sliceStatus(value, avg) {
  if (!avg) return 'blue';
  const ratio = value / avg;
  if (ratio < 0.9) return 'green';
  if (ratio > 1.1) return 'red';
  return 'blue';
}