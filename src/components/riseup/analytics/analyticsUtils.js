import moment from 'moment';

// Hex colors matching the group Tailwind shades (recharts needs raw values)
export const GROUP_COLORS = {
  income: '#10b981', housing: '#0ea5e9', food: '#f59e0b', dining: '#f97316',
  transport: '#6366f1', health: '#f43f5e', kids: '#8b5cf6', personal: '#ec4899',
  lifestyle: '#d946ef', giving: '#14b8a6', financial: '#64748b', other: '#a8a29e'
};

export const PALETTE = ['#3b82f6', '#fb7185', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#eab308', '#6366f1'];

export const cleanExpenses = (transactions) =>
  transactions.filter(t => !t.inc && !t.ignored && !t.internal);

export const monthShort = (m) => moment(m, 'YYYY-MM').format('MMM YY');

export function totalsBy(txs, keyFn) {
  const map = {};
  txs.forEach(t => { const k = keyFn(t); map[k] = (map[k] || 0) + t.amt; });
  return map;
}

export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (!dx || !dy) return null;
  return num / Math.sqrt(dx * dy);
}