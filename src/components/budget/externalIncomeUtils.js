export const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

const thisMonth = () => new Date().toISOString().slice(0, 7);
const nextMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

export const monthlyILS = (e) =>
  (e.amount_usd * (e.exchange_rate || 3.7)) / (FREQ_DIV[e.frequency] || 1);

// A one-time deposit "pot" that is sliced into monthly spendable income
export const isPot = (e) => e.frequency === 'one_time' && Number(e.monthly_slice_usd) > 0;

const potStartMonth = (e) => (e.start_date || new Date().toISOString().slice(0, 10)).slice(0, 7);

// Actual USD transferred from this pot in a month (null if no transfer logged)
export function actualUSDForMonth(e, month, transfers) {
  const rate = e.exchange_rate || 3.7;
  const rows = (transfers || []).filter(t => t.income_id === e.id && (t.date || '').slice(0, 7) === month);
  if (!rows.length) return null;
  return rows.reduce((s, t) => s + (t.amount_ils || 0) / rate, 0);
}

// USD drawn from a pot in a given month: actual transfer if logged, else the planned slice capped by what's left
export function potDrawUSD(e, month, transfers) {
  const startM = potStartMonth(e);
  if (!month || month < startM) return 0;
  let remaining = e.amount_usd;
  let m = startM, guard = 0;
  while (m < month && guard++ < 240) {
    const act = actualUSDForMonth(e, m, transfers);
    remaining -= act != null ? act : Math.min(e.monthly_slice_usd, Math.max(remaining, 0));
    m = nextMonth(m);
  }
  const act = actualUSDForMonth(e, month, transfers);
  return act != null ? act : Math.min(e.monthly_slice_usd, Math.max(remaining, 0));
}

// USD left in the pot after drawing through a month (defaults to the current month)
export function potRemainingUSD(e, transfers, throughMonth) {
  const end = throughMonth || thisMonth();
  let remaining = e.amount_usd;
  let m = potStartMonth(e), guard = 0;
  while (m <= end && guard++ < 240) {
    const act = actualUSDForMonth(e, m, transfers);
    remaining -= act != null ? act : Math.min(e.monthly_slice_usd, Math.max(remaining, 0));
    m = nextMonth(m);
  }
  return remaining;
}

// ILS from transfers already visible (un-ignored) in the RiseUp cash flow for a month
export function countedILSForMonth(e, month, transfers) {
  return (transfers || [])
    .filter(t => t.income_id === e.id && t.counted_in_cashflow && (t.date || '').slice(0, 7) === month)
    .reduce((s, t) => s + (t.amount_ils || 0), 0);
}

// ILS this source contributes to a given month
// (transfers already counted in the RiseUp cash flow are not re-added)
export function monthlyILSForMonth(e, month, transfers) {
  if (isPot(e)) {
    const gross = potDrawUSD(e, month, transfers) * (e.exchange_rate || 3.7);
    return Math.max(gross - countedILSForMonth(e, month, transfers), 0);
  }
  return monthlyILS(e);
}

// Does this source count for a given 'YYYY-MM' month?
export function countsInMonth(e, month, transfers) {
  if (e.active === false) return false;
  if (!month) return true;
  if (isPot(e)) return potDrawUSD(e, month, transfers) > 0;
  if (e.frequency === 'one_time') {
    // A single (unsliced) deposit counts only in the month it arrives
    return month === potStartMonth(e);
  }
  if (e.start_date && month < e.start_date.slice(0, 7)) return false;
  if (e.end_date && month > e.end_date.slice(0, 7)) return false;
  return true;
}

// For the current real-time month, the money only counts once its deposit day has arrived
// (an actual logged transfer always counts as landed)
export function hasLanded(e, month, transfers) {
  if (isPot(e) && actualUSDForMonth(e, month, transfers) != null) return true;
  if (!e.deposit_day || !month) return true;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month === currentMonth && now.getDate() < e.deposit_day) return false;
  return true;
}

export const externalMonthlyILSForMonth = (externals, month, transfers) =>
  (externals || [])
    .filter((e) => countsInMonth(e, month, transfers) && hasLanded(e, month, transfers))
    .reduce((s, e) => s + monthlyILSForMonth(e, month, transfers), 0);