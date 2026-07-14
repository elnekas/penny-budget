import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

const DATA_URL = 'https://media.base44.com/files/public/69b7ce97ba10383cab6b7215/5e2b6fe26_finance_snapshot.json';

const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];

function groupForCategory(catName, isIncome) {
  if (isIncome) return 'Income';
  const c = (catName || '').toLowerCase();
  if (/(grocer|makolet|supermarket|butcher|bakery|fruit|veg)/.test(c)) return 'Food & Groceries';
  if (/(restaurant|cafe|coffee|dining|eating|wolt|takeaway|fast food|pizza)/.test(c)) return 'Dining Out';
  if (/(car|fuel|parking|transport|bus|train|taxi|rav kav)/.test(c)) return 'Transportation';
  if (/(pharma|health|medical|dental|doctor|kupat|optic)/.test(c)) return 'Health & Pharmacy';
  if (/(educat|school|tuition|gan|kid|child|camp|chug|babysit|toy)/.test(c)) return 'Kids & Education';
  if (/(cloth|footwear|shoe|beauty|cosmetic|barber|hair)/.test(c)) return 'Clothing & Personal';
  if (/(charity|tzedaka|donation|maaser)/.test(c)) return 'Giving & Tzedaka';
  if (/(wellness|gym|sport|fitness|spa|digital|subscription|stream|entertain|hobby|pet|vet|travel|vacation|hotel|flight)/.test(c)) return 'Lifestyle & Leisure';
  if (/(arnona|electric|water|rent|mortgage|vaad|city tax|phone|cell|internet|communi|municipal|home)/.test(c)) return 'Housing & Bills';
  if (/(insurance|fee|atm|interest|loan|saving|invest|bank|payment)/.test(c)) return 'Fees & Financial';
  return 'Other';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload = {};
    try { payload = await req.json(); } catch (_e) { /* no body */ }

    const res = await fetch(DATA_URL);
    if (!res.ok) return Response.json({ error: 'Failed to fetch RiseUp snapshot' }, { status: 502 });
    const snap = await res.json();

    const overrides = await base44.asServiceRole.entities.RiseUpOverride.list('-created_date', 2000);
    const ovMap = new Map(overrides.map((o) => [o.tx_id, o]));

    // Duplicate detection
    const dupCount = {};
    for (const t of snap.transactions) {
      const k = t.name + '|' + t.amt + '|' + t.td;
      dupCount[k] = (dupCount[k] || 0) + 1;
    }

    // Merge overrides, drop ignored + internal transfers
    const txs = [];
    for (const t of snap.transactions) {
      const ov = ovMap.get(t.id);
      if (ov && ov.ignored) continue;
      if (t.name && INTERNAL_STRINGS.some((s) => t.name.includes(s))) continue;
      const category = (ov && ov.category) || t.catName || 'General';
      txs.push({ ...t, category, group: groupForCategory(category, t.inc), possibleDuplicate: dupCount[t.name + '|' + t.amt + '|' + t.td] > 1 });
    }

    // Monthly totals
    const byMonth = {};
    for (const m of snap.months) byMonth[m] = { income: 0, expense: 0 };
    for (const t of txs) {
      if (!byMonth[t.m]) continue;
      if (t.inc) byMonth[t.m].income += t.amt;
      else byMonth[t.m].expense += t.amt;
    }
    for (const m of Object.keys(byMonth)) {
      byMonth[m].income = Math.round(byMonth[m].income);
      byMonth[m].expense = Math.round(byMonth[m].expense);
      byMonth[m].net = byMonth[m].income - byMonth[m].expense;
    }

    // Focus month (default: latest full month)
    const month = payload.month || (snap.months.length > 1 ? snap.months[snap.months.length - 2] : snap.months[0]);
    const monthTxs = txs.filter((t) => t.m === month);

    const byGroup = {};
    const byCategory = {};
    for (const t of monthTxs) {
      if (t.inc) continue;
      byGroup[t.group] = Math.round((byGroup[t.group] || 0) + t.amt);
      byCategory[t.category] = Math.round((byCategory[t.category] || 0) + t.amt);
    }

    const topExpenses = monthTxs
      .filter((t) => !t.inc)
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 15)
      .map((t) => ({ name: t.name, amount: Math.round(t.amt), date: t.td, category: t.category, group: t.group, fixed: t.fixed }));

    const possibleDuplicates = monthTxs
      .filter((t) => t.possibleDuplicate)
      .slice(0, 20)
      .map((t) => ({ name: t.name, amount: Math.round(t.amt), date: t.td }));

    return Response.json({
      generated_at: snap.generated_at,
      months: snap.months,
      by_month: byMonth,
      focus_month: month,
      focus_month_label: snap.month_labels ? snap.month_labels[month] : month,
      expenses_by_group: byGroup,
      expenses_by_category: byCategory,
      top_expenses: topExpenses,
      possible_duplicates: possibleDuplicates,
      notes: 'Amounts in ILS. Ignored transactions and internal transfers/card settlements are excluded. Categories reflect the user\'s manual overrides.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});