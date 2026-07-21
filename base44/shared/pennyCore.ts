// Shared Penny finance logic — used by budgetCoach (dashboard chat) and pennyBudgetTools (WhatsApp agent)

export const SNAPSHOT_URL = 'https://golem-ab6b7215.base44.app/functions/financeSnapshot';

export const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];

export const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

// Budget-planner groups — must match src/components/riseup/riseupGroups.js
export const GROUP_LABELS = {
  income: 'Income', housing: 'Housing & Bills', food: 'Food & Groceries', dining: 'Dining Out',
  transport: 'Transportation', health: 'Health & Pharmacy', kids: 'Kids & Education',
  personal: 'Clothing & Personal', lifestyle: 'Lifestyle & Leisure', giving: 'Giving & Tzedaka',
  financial: 'Fees & Financial', other: 'Other'
};

export function groupForCategory(catName, isIncome) {
  if (isIncome) return 'income';
  const c = (catName || '').toLowerCase();
  if (/(grocer|makolet|supermarket|butcher|bakery|fruit|veg)/.test(c)) return 'food';
  if (/(restaurant|cafe|coffee|dining|eating|wolt|takeaway|fast food|pizza)/.test(c)) return 'dining';
  if (/(car|fuel|parking|transport|bus|train|taxi|rav kav)/.test(c)) return 'transport';
  if (/(pharma|health|medical|dental|doctor|kupat|optic)/.test(c)) return 'health';
  if (/(educat|school|tuition|gan|kid|child|camp|chug|babysit|toy)/.test(c)) return 'kids';
  if (/(cloth|footwear|shoe|beauty|cosmetic|barber|hair)/.test(c)) return 'personal';
  if (/(charity|tzedaka|donation|maaser)/.test(c)) return 'giving';
  if (/(wellness|gym|sport|fitness|spa|digital|subscription|stream|entertain|hobby|pet|vet|travel|vacation|hotel|flight)/.test(c)) return 'lifestyle';
  if (/(arnona|electric|water|rent|mortgage|vaad|city tax|phone|cell|internet|communi|municipal|home)/.test(c)) return 'housing';
  if (/(insurance|fee|atm|interest|loan|saving|invest|bank|payment)/.test(c)) return 'financial';
  return 'other';
}

// Query individual transactions with filters and grouping
export function runQuery(txs, q) {
  const from = q.from || '0000-00-00';
  const to = q.to || '9999-12-31';
  let rows = txs.filter((t) => t.td >= from && t.td <= to);
  if (q.type === 'income') rows = rows.filter((t) => t.inc);
  else if (q.type !== 'all') rows = rows.filter((t) => !t.inc);
  if (q.category) { const c = q.category.toLowerCase(); rows = rows.filter((t) => t.cat.toLowerCase().includes(c)); }
  if (q.merchant) { const s = q.merchant.toLowerCase(); rows = rows.filter((t) => (t.name || '').toLowerCase().includes(s)); }
  const keyFor = (t) => {
    if (q.group_by === 'day') return t.td;
    if (q.group_by === 'week') { const d = new Date(t.td); d.setDate(d.getDate() - d.getDay()); return 'week of ' + d.toISOString().slice(0, 10); }
    if (q.group_by === 'category') return t.cat;
    if (q.group_by === 'merchant') return t.name || '?';
    return t.m;
  };
  const groups = {};
  rows.forEach((t) => { const k = keyFor(t); groups[k] = (groups[k] || 0) + t.amt; });
  const byName = q.group_by === 'category' || q.group_by === 'merchant';
  const breakdown = Object.entries(groups)
    .map(([key, total]) => ({ key, total: Math.round(total) }))
    .sort((a, b) => byName ? b.total - a.total : a.key.localeCompare(b.key))
    .slice(0, 40);
  const largest = [...rows].sort((a, b) => b.amt - a.amt).slice(0, 25)
    .map((t) => ({ date: t.td, name: t.name, amount: Math.round(t.amt), category: t.cat }));
  return { matched_transactions: rows.length, total: Math.round(rows.reduce((s, t) => s + t.amt, 0)), breakdown, largest };
}

// Load the RiseUp snapshot + all budget entities, resolve categories exactly like the frontend
export async function loadFinanceData(base44) {
  const [snapRes, externals, goals, overrides, renames, transfers, plans, groupOverrides] = await Promise.all([
    fetch(SNAPSHOT_URL),
    base44.entities.ExternalIncome.list('-created_date', 100),
    base44.entities.CategoryGoal.list('-created_date', 300),
    base44.entities.RiseUpOverride.list('-created_date', 2000),
    base44.entities.RiseUpCategoryRename.list('-created_date', 500),
    base44.entities.DepositTransfer.list('-created_date', 500),
    base44.entities.BudgetPlan.list('-created_date', 200),
    base44.entities.RiseUpCategoryGroup.list('-created_date', 500)
  ]);
  const snapshot = await snapRes.json();

  const ovMap = new Map();
  overrides.forEach((o) => { if (!ovMap.has(o.tx_id)) ovMap.set(o.tx_id, o); });
  const renameMap = new Map();
  renames.forEach((r) => { if (!renameMap.has(r.old_name)) renameMap.set(r.old_name, r.new_name); });
  const groupMap = new Map();
  groupOverrides.forEach((g) => { if (!groupMap.has(g.category_name)) groupMap.set(g.category_name, g.group); });

  const months = snapshot.months || [];
  const monthly = {};
  months.forEach((m) => { monthly[m] = { income: 0, fixed: 0, variable: 0, categories: {} }; });

  const allTxs = [];
  (snapshot.transactions || []).forEach((t) => {
    const ov = ovMap.get(t.id);
    if (ov?.ignored) return;
    if (t.name && INTERNAL_STRINGS.some((s) => t.name.includes(s))) return;
    let cat = ov?.category || t.catName || 'General';
    cat = renameMap.get(cat) || cat;
    const group = groupMap.get(cat) || groupForCategory(cat, !!t.inc);
    allTxs.push({ name: t.name, amt: t.amt, td: t.td || '', m: t.m, inc: !!t.inc, fixed: !!t.fixed, cat, group, planned: !!ov?.planned });
    const s = monthly[t.m];
    if (!s) return;
    if (t.inc) s.income += t.amt;
    else if (t.fixed) s.fixed += t.amt;
    else { s.variable += t.amt; s.categories[cat] = (s.categories[cat] || 0) + t.amt; }
  });

  return { snapshot, externals, goals, transfers, plans, ovMap, months, monthly, allTxs };
}

const nextM = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

// Overseas USD income + local dollar buffer — returns text lines and this month's ILS totals
export function computeExternalIncome(externals, transfers, nowMonth) {
  let extSpend = 0, extReinvest = 0, bufferDraw = 0;
  const lineFor = (e) => {
    const rate = e.exchange_rate || 3.7;
    const pct = (e.spend_pct ?? 40) / 100;
    if (e.frequency === 'one_time' && e.monthly_slice_usd > 0) {
      let remaining = e.amount_usd, draw = 0, guard = 0;
      let m = (e.start_date || `${nowMonth}-01`).slice(0, 7);
      while (m <= nowMonth && guard++ < 240) {
        const rows = transfers.filter((t) => t.income_id === e.id && (t.date || '').slice(0, 7) === m);
        const d = rows.length ? rows.reduce((s, t) => s + (t.amount_ils || 0) / rate, 0) : Math.min(e.monthly_slice_usd, Math.max(remaining, 0));
        if (m === nowMonth) draw = d;
        remaining -= d;
        m = nextM(m);
      }
      const countedILS = transfers.filter((t) => t.income_id === e.id && t.counted_in_cashflow && (t.date || '').slice(0, 7) === nowMonth).reduce((s, t) => s + (t.amount_ils || 0), 0);
      const mILS = Math.max(draw * rate - countedILS, 0);
      if (mILS > 0) {
        if (e.kind === 'buffer') bufferDraw += mILS;
        else { extSpend += mILS * pct; extReinvest += mILS * (1 - pct); }
      }
      return `- ${e.source_name}: one-time pot of $${e.amount_usd}, planned slice $${e.monthly_slice_usd}/mo @ rate ${rate} → this month ₪${Math.round(mILS)} (${e.spend_pct ?? 40}% spendable), ~$${Math.round(Math.max(remaining, 0))} left after this month. Actual NIS transfers logged by the user override the planned slice.`;
    }
    const monthlyILS = (e.amount_usd * rate) / (FREQ_DIV[e.frequency] || 1);
    const started = e.frequency === 'one_time'
      ? (e.start_date || '').slice(0, 7) === nowMonth
      : (!e.start_date || e.start_date.slice(0, 7) <= nowMonth) && (!e.end_date || e.end_date.slice(0, 7) >= nowMonth);
    if (started) {
      if (e.kind === 'buffer') bufferDraw += monthlyILS;
      else { extSpend += monthlyILS * pct; extReinvest += monthlyILS * (1 - pct); }
    }
    return `- ${e.source_name}: $${e.amount_usd} ${e.frequency} @ rate ${e.exchange_rate || 3.7} → ₪${Math.round(monthlyILS)}/mo (${e.spend_pct ?? 40}% spendable)${e.start_date ? `, started ${e.start_date}` : ''}${e.end_date ? `, ends ${e.end_date}` : ''}${e.deposit_day ? `, lands on day ${e.deposit_day}` : ''}${started ? '' : ' — NOT ACTIVE THIS MONTH, excluded from totals'}`;
  };
  const activeExt = externals.filter((e) => e.active !== false);
  const extLines = activeExt.filter((e) => e.kind !== 'buffer').map(lineFor);
  const bufferLines = activeExt.filter((e) => e.kind === 'buffer').map(lineFor);
  return { extLines, bufferLines, extSpend, extReinvest, bufferDraw };
}

// Budget Planning Zone state: per-group budgeted / spent / upcoming fixed / remaining (matches the planner UI)
export function computePlannerState(allTxs, months, plans) {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const avgMonths = months.slice(0, -1).slice(-6);
  const avgSet = new Set(avgMonths);
  const groupAvg = {};
  const groupSpent = {};
  const spentNames = {};
  const fixedAgg = {};
  allTxs.forEach((t) => {
    if (t.inc || t.planned) return;
    if (avgSet.has(t.m)) groupAvg[t.group] = (groupAvg[t.group] || 0) + t.amt;
    if (t.m === nowMonth) {
      groupSpent[t.group] = (groupSpent[t.group] || 0) + t.amt;
      (spentNames[t.group] = spentNames[t.group] || new Set()).add(t.name);
    }
    if (avgSet.has(t.m) && t.fixed) {
      const g = fixedAgg[t.group] = fixedAgg[t.group] || {};
      const e = g[t.name] = g[t.name] || { total: 0, months: new Set() };
      e.total += t.amt;
      e.months.add(t.m);
    }
  });
  Object.keys(groupAvg).forEach((g) => { groupAvg[g] = Math.round(groupAvg[g] / (avgMonths.length || 1)); });

  // Recurring fixed bills not yet charged this month
  const minMonths = Math.max(2, Math.ceil(avgMonths.length / 2));
  const upcomingFixed = {};
  Object.entries(fixedAgg).forEach(([g, names]) => {
    let tot = 0; const items = [];
    Object.entries(names).forEach(([name, v]) => {
      if (spentNames[g]?.has(name) || v.months.size < minMonths) return;
      const amt = Math.round(v.total / v.months.size);
      tot += amt;
      items.push(`${name} ₪${amt}`);
    });
    if (tot > 0) upcomingFixed[g] = { total: tot, items };
  });

  const currentPlan = plans.find((p) => p.month === nowMonth);
  const groups = Object.keys(groupAvg).sort((a, b) => (groupAvg[b] || 0) - (groupAvg[a] || 0)).map((g) => {
    const budgeted = Math.round(currentPlan?.allocations?.[g] ?? groupAvg[g]);
    const spent = Math.round(groupSpent[g] || 0);
    const upTotal = upcomingFixed[g]?.total || 0;
    return {
      group: g,
      label: GROUP_LABELS[g] || g,
      budgeted,
      explicitly_set: currentPlan?.allocations?.[g] != null,
      spent,
      expected_fixed_still_to_come: upTotal,
      expected_fixed_items: upcomingFixed[g]?.items || [],
      remaining: Math.round(budgeted - spent - upTotal),
      avg_6mo: groupAvg[g]
    };
  });
  const otherPlans = plans.filter((p) => p.month !== nowMonth && p.month >= nowMonth)
    .map((p) => ({ month: p.month, budget_goal: p.budget_goal ?? null, allocations: p.allocations || {} }));

  return { nowMonth, budget_goal: currentPlan?.budget_goal ?? null, groups, other_plans: otherPlans };
}

// Execute a data-changing action. Returns a result string, or null when the action is unknown/invalid.
export async function executeAction(base44, act, { goals, plans, snapshot, ovMap }) {
  const nowMonth = new Date().toISOString().slice(0, 7);
  if (act?.type === 'set_goal' && act.category && act.monthly_target > 0) {
    const existing = goals.find((g) => g.category === act.category);
    if (existing) await base44.entities.CategoryGoal.update(existing.id, { monthly_target: act.monthly_target });
    else await base44.entities.CategoryGoal.create({ category: act.category, monthly_target: act.monthly_target });
    return `set_goal:${act.category}`;
  }
  if (act?.type === 'add_external_income' && act.source_name && act.amount_usd > 0) {
    await base44.entities.ExternalIncome.create({
      source_name: act.source_name,
      amount_usd: act.amount_usd,
      frequency: ['monthly', 'quarterly', 'yearly', 'one_time'].includes(act.frequency) ? act.frequency : 'monthly',
      exchange_rate: act.exchange_rate || 3.7,
      spend_pct: act.spend_pct ?? 40,
      active: true,
      ...(act.monthly_slice_usd > 0 ? { monthly_slice_usd: act.monthly_slice_usd } : {}),
      ...(act.start_date ? { start_date: act.start_date } : {}),
      ...(act.end_date ? { end_date: act.end_date } : {}),
      ...(act.deposit_day ? { deposit_day: act.deposit_day } : {})
    });
    return `add_external_income:${act.source_name}`;
  }
  if (act?.type === 'recategorize_merchant' && act.merchant && act.category) {
    const q = act.merchant.toLowerCase();
    const txIds = (snapshot.transactions || [])
      .filter((t) => (t.name || '').toLowerCase().includes(q))
      .map((t) => t.id)
      .slice(0, 500);
    const updates = [];
    const creates = [];
    txIds.forEach((id) => {
      const existing = ovMap.get(id);
      if (existing) updates.push({ id: existing.id, category: act.category });
      else creates.push({ tx_id: id, category: act.category });
    });
    if (updates.length) await base44.entities.RiseUpOverride.bulkUpdate(updates);
    if (creates.length) await base44.entities.RiseUpOverride.bulkCreate(creates);
    return `recategorize:${txIds.length}`;
  }
  if (act?.type === 'set_plan_allocation' && act.group && act.amount >= 0) {
    const m = act.month || nowMonth;
    const existing = plans.find((p) => p.month === m);
    if (existing) {
      await base44.entities.BudgetPlan.update(existing.id, { allocations: { ...(existing.allocations || {}), [act.group]: act.amount } });
    } else {
      await base44.entities.BudgetPlan.create({ month: m, allocations: { [act.group]: act.amount } });
    }
    return `set_plan_allocation:${act.group}=${act.amount}@${m}`;
  }
  if (act?.type === 'set_budget_goal' && act.amount > 0) {
    const m = act.month || nowMonth;
    const existing = plans.find((p) => p.month === m);
    if (existing) await base44.entities.BudgetPlan.update(existing.id, { budget_goal: act.amount });
    else await base44.entities.BudgetPlan.create({ month: m, budget_goal: act.amount });
    return `set_budget_goal:${act.amount}@${m}`;
  }
  return null;
}