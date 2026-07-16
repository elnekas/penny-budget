export const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

export const monthlyILS = (e) =>
  (e.amount_usd * (e.exchange_rate || 3.7)) / (FREQ_DIV[e.frequency] || 1);

// Does this source count for a given 'YYYY-MM' month? (start date gate)
export function countsInMonth(e, month) {
  if (e.active === false) return false;
  if (!month) return true;
  if (e.start_date && month < e.start_date.slice(0, 7)) return false;
  if (e.end_date && month > e.end_date.slice(0, 7)) return false;
  return true;
}

// For the current real-time month, the money only counts once its deposit day has arrived
export function hasLanded(e, month) {
  if (!e.deposit_day || !month) return true;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month === currentMonth && now.getDate() < e.deposit_day) return false;
  return true;
}

export const externalMonthlyILSForMonth = (externals, month) =>
  (externals || [])
    .filter((e) => countsInMonth(e, month) && hasLanded(e, month))
    .reduce((s, e) => s + monthlyILS(e), 0);