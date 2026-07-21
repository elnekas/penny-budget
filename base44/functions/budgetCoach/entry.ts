import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SNAPSHOT_URL = 'https://golem-ab6b7215.base44.app/functions/financeSnapshot';
const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];
const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

// Budget-planner groups — must match src/components/riseup/riseupGroups.js
const GROUP_LABELS: Record<string, string> = {
  income: 'Income', housing: 'Housing & Bills', food: 'Food & Groceries', dining: 'Dining Out',
  transport: 'Transportation', health: 'Health & Pharmacy', kids: 'Kids & Education',
  personal: 'Clothing & Personal', lifestyle: 'Lifestyle & Leisure', giving: 'Giving & Tzedaka',
  financial: 'Fees & Financial', other: 'Other'
};
function groupForCategory(catName: string, isIncome: boolean) {
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

function runQuery(txs, q) {
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return Response.json({ error: 'messages required' }, { status: 400 });
    }

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

    // Resolve categories the same way the frontend does
    const ovMap = new Map();
    overrides.forEach((o) => { if (!ovMap.has(o.tx_id)) ovMap.set(o.tx_id, o); });
    const renameMap = new Map();
    renames.forEach((r) => { if (!renameMap.has(r.old_name)) renameMap.set(r.old_name, r.new_name); });
    const groupMap = new Map();
    groupOverrides.forEach((g) => { if (!groupMap.has(g.category_name)) groupMap.set(g.category_name, g.group); });

    const months = snapshot.months || [];
    const monthly: Record<string, { income: number; fixed: number; variable: number; categories: Record<string, number> }> = {};
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

    // External USD income
    let extSpend = 0, extReinvest = 0, bufferDraw = 0;
    const nowMonth = new Date().toISOString().slice(0, 7);
    const nextM = (m) => {
      const [y, mo] = m.split('-').map(Number);
      return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
    };
    const lineFor = (e) => {
      const rate = e.exchange_rate || 3.7;
      const pct = (e.spend_pct ?? 40) / 100;
      if (e.frequency === 'one_time' && e.monthly_slice_usd > 0) {
        // Sliced pot: planned monthly slice, overridden by actual logged transfers
        let remaining = e.amount_usd, draw = 0, guard = 0;
        let m = (e.start_date || `${nowMonth}-01`).slice(0, 7);
        while (m <= nowMonth && guard++ < 240) {
          const rows = transfers.filter((t) => t.income_id === e.id && (t.date || '').slice(0, 7) === m);
          const d = rows.length ? rows.reduce((s, t) => s + (t.amount_ils || 0) / rate, 0) : Math.min(e.monthly_slice_usd, Math.max(remaining, 0));
          if (m === nowMonth) draw = d;
          remaining -= d;
          m = nextM(m);
        }
        // Transfers already visible (un-ignored) in the RiseUp cash flow are not re-added
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

    // Compact data summary for the model
    const monthTable = months.map((m) => {
      const s = monthly[m];
      return `${m}: income ₪${Math.round(s.income)}, fixed ₪${Math.round(s.fixed)}, variable ₪${Math.round(s.variable)}`;
    }).join('\n');

    const recentMonths = months.slice(-4);
    const catTotals: Record<string, number> = {};
    recentMonths.forEach((m) => Object.entries(monthly[m].categories).forEach(([c, v]) => { catTotals[c] = (catTotals[c] || 0) + (v as number); }));
    const topCats = Object.entries(catTotals).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 18);
    const catTable = topCats.map(([c]) =>
      `${c}: ` + recentMonths.map((m) => `${m}=₪${Math.round(monthly[m].categories[c] || 0)}`).join(', ')
    ).join('\n');

    const goalLines = goals.map((g) => `- ${g.category}: ceiling ₪${g.monthly_target}/mo`).join('\n') || 'No category goals set yet.';

    // Budget Planning Zone state — allocations live per GROUP (not per category)
    const avgMonths = months.slice(0, -1).slice(-6);
    const avgSet = new Set(avgMonths);
    const groupAvg: Record<string, number> = {};
    const groupSpent: Record<string, number> = {};
    allTxs.forEach((t) => {
      if (t.inc || t.planned) return;
      if (avgSet.has(t.m)) groupAvg[t.group] = (groupAvg[t.group] || 0) + t.amt;
      if (t.m === nowMonth) groupSpent[t.group] = (groupSpent[t.group] || 0) + t.amt;
    });
    Object.keys(groupAvg).forEach((g) => { groupAvg[g] = Math.round(groupAvg[g] / (avgMonths.length || 1)); });
    const currentPlan = plans.find((p) => p.month === nowMonth);
    const plannerLines = Object.keys(groupAvg).sort((a, b) => (groupAvg[b] || 0) - (groupAvg[a] || 0)).map((g) => {
      const planned = currentPlan?.allocations?.[g] ?? groupAvg[g];
      const spent = Math.round(groupSpent[g] || 0);
      return `- ${g} (${GROUP_LABELS[g] || g}): budgeted ₪${Math.round(planned)}${currentPlan?.allocations?.[g] == null ? ' (default = avg, not explicitly set)' : ''}, spent so far ₪${spent}, remaining ₪${Math.round(planned - spent)}, 6-mo avg ₪${groupAvg[g]}`;
    }).join('\n');
    const otherPlans = plans.filter((p) => p.month !== nowMonth && p.month >= nowMonth).map((p) =>
      `- ${p.month}: goal ₪${p.budget_goal ?? '—'}, allocations ${JSON.stringify(p.allocations || {})}`
    ).join('\n');

    const systemPrompt = `You are Penny, a warm, sharp personal-finance coach. You blend Dave Ramsey's discipline (every shekel has a job, attack fixed costs) with Tony Robbins' growth mindset (focus on freedom, momentum, and goals). The user follows a Growth + Goal-Based methodology: proportional buckets plus per-category variable-spend ceilings.

You are embedded in the user's live "Budget Cockpit" dashboard and can CONTROL the UI. Currency is ₪ (ILS). The last month in the data is the current, partial month.

USER'S LIVE DATA:
Monthly overview:
${monthTable}

Variable spending by category (last ${recentMonths.length} months, exact category names — use them verbatim):
${catTable}

Overseas USD income (already part of the budget; spendable portion adds ₪${Math.round(extSpend)}/mo to income, ₪${Math.round(extReinvest)}/mo goes to reinvestment):
${extLines.join('\n') || 'None configured.'}

Local dollar savings buffer (NOT income — this is savings sitting in the user's local USD account, converted to ₪ as needed to cover monthly deficits while the real overseas income stays invested abroad; drawing ~₪${Math.round(bufferDraw)} this month):
${bufferLines.join('\n') || 'None configured.'}

Category goals:
${goalLines}

BUDGET PLANNING ZONE (current month ${nowMonth}) — the user's live plan. Allocations are per GROUP (use the exact group ids below). Overall budget goal this month: ${currentPlan?.budget_goal ? `₪${currentPlan.budget_goal}` : 'not set'}.
${plannerLines || 'No planner data yet.'}
${otherPlans ? `Saved plans for other months:\n${otherPlans}` : ''}
When the user asks "how much is left for X this month", map X to its group (e.g. clothing → personal, restaurants → dining, groceries → food) and answer with budgeted, spent, and remaining from the planner state above.

DATA QUERY TOOL — you have access to EVERY individual transaction. Today is ${new Date().toISOString().slice(0, 10)}; the data spans ${months[0] || ''} to today. Whenever the user asks anything needing exact or granular numbers not in the summary above (this week's groceries, year-to-date totals, a specific merchant, a custom date range, weekly patterns, daily detail), respond with ONLY this JSON and nothing else:
{"query": {"from":"YYYY-MM-DD","to":"YYYY-MM-DD","category":"<substring match on category, optional>","merchant":"<substring match on transaction name, optional>","type":"expense"|"income"|"all" (default expense),"group_by":"day"|"week"|"month"|"category"|"merchant" (optional)}}
You'll receive matched totals, a breakdown, and the largest transactions — then give your final answer. You may query up to 3 times (e.g. to compare two ranges). NEVER guess or estimate a number you can query — query it.

RESPONSE FORMAT — final answers return ONLY valid JSON:
{"reply": "your coaching message in markdown (concise, specific numbers, encouraging, 1-2 emojis max)", "ui_action": <action or null>, "action": <action or null>, "chart": <chart or null>}

"chart" renders a graph right inside the chat — use it whenever a visual helps explain the numbers (trends, comparisons, composition):
{"type":"bar"|"line"|"pie","title":"<short title>","data":[{"label":"<short label>","value":<number, ILS>}]}
Use pie for composition, line for trends over time, bar for comparisons. Max ~12 data points, short labels. Use null when no visual is needed.

ui_action lets you show things on the dashboard. Use it whenever you discuss specific categories or months:
- {"type":"focus_category","category":"<exact category name>","months":["YYYY-MM"]} — spotlight one category for one month (or 2-4 months side by side for comparison)
- {"type":"compare_chart","category":"<exact category name>","months":["YYYY-MM",...]} — bar chart of a category across months
- {"type":"show_gauge","month":"YYYY-MM"} — point at the Freedom Gauge for a month
- {"type":"reset"} — clear the spotlight
Use null for general strategy talk with no specific visual. Month codes and category names must match the data exactly.

"action" lets you MAKE REAL CHANGES to the user's data. Use it ONLY when the user clearly asks for a change, and confirm exactly what you did in your reply:
- {"type":"set_goal","category":"<exact category name from the data>","monthly_target":<number, ILS>} — set or update a monthly spending ceiling (e.g. "Cap dining at 1500")
- {"type":"add_external_income","source_name":"<name>","amount_usd":<number>,"frequency":"monthly"|"quarterly"|"yearly"|"one_time" (one_time = a single deposit; set start_date to the deposit date),"monthly_slice_usd":<number, optional — for one_time pots: how many USD/month to budget as spendable income until the pot runs out>,"exchange_rate":<number, optional>,"spend_pct":<0-100, optional, % spendable>,"start_date":"YYYY-MM-DD" (optional, when it begins),"end_date":"YYYY-MM-DD" (optional, when it ends),"deposit_day":<1-31, optional, day of month it lands>} — add an overseas income source
- {"type":"recategorize_merchant","merchant":"<merchant name as it appears in transactions>","category":"<target category>"} — move ALL of that merchant's transactions to a category
- {"type":"set_plan_allocation","group":"<exact group id from the planner state>","amount":<number, ILS>,"month":"YYYY-MM" (optional, default current month)} — set the budget for a group in the Budget Planning Zone (e.g. "Set my clothing budget to 4000 this month" → group "personal"). Note: for the live month the plan can't go below what's already spent.
- {"type":"set_budget_goal","amount":<number, ILS>,"month":"YYYY-MM" (optional, default current month)} — set the overall monthly budget goal in the planner
If the request is ambiguous (unknown category or merchant), ask for clarification in your reply instead of acting. Use null when no change is requested.`;

    const callGemini = async (contents) => {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.6 }
          })
        }
      );
      const gj = await geminiRes.json();
      return gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let parsed = null;
    for (let round = 0; round < 4; round++) {
      const text = await callGemini(contents);
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch (_e) {
        parsed = { reply: text || "I couldn't process that — try rephrasing?", ui_action: null };
        break;
      }
      if (parsed.query && round < 3) {
        const result = runQuery(allTxs, parsed.query);
        contents.push({ role: 'model', parts: [{ text }] });
        contents.push({ role: 'user', parts: [{ text: 'QUERY RESULT: ' + JSON.stringify(result) }] });
        continue;
      }
      break;
    }

    // Execute any data-changing action Penny decided on
    let actionResult = null;
    const act = parsed.action;
    if (act?.type === 'set_goal' && act.category && act.monthly_target > 0) {
      const existing = goals.find((g) => g.category === act.category);
      if (existing) await base44.entities.CategoryGoal.update(existing.id, { monthly_target: act.monthly_target });
      else await base44.entities.CategoryGoal.create({ category: act.category, monthly_target: act.monthly_target });
      actionResult = `set_goal:${act.category}`;
    } else if (act?.type === 'add_external_income' && act.source_name && act.amount_usd > 0) {
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
      actionResult = `add_external_income:${act.source_name}`;
    } else if (act?.type === 'recategorize_merchant' && act.merchant && act.category) {
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
      actionResult = `recategorize:${txIds.length}`;
    } else if (act?.type === 'set_plan_allocation' && act.group && act.amount >= 0) {
      const m = act.month || nowMonth;
      const existing = plans.find((p) => p.month === m);
      if (existing) {
        await base44.entities.BudgetPlan.update(existing.id, { allocations: { ...(existing.allocations || {}), [act.group]: act.amount } });
      } else {
        await base44.entities.BudgetPlan.create({ month: m, allocations: { [act.group]: act.amount } });
      }
      actionResult = `set_plan_allocation:${act.group}=${act.amount}@${m}`;
    } else if (act?.type === 'set_budget_goal' && act.amount > 0) {
      const m = act.month || nowMonth;
      const existing = plans.find((p) => p.month === m);
      if (existing) await base44.entities.BudgetPlan.update(existing.id, { budget_goal: act.amount });
      else await base44.entities.BudgetPlan.create({ month: m, budget_goal: act.amount });
      actionResult = `set_budget_goal:${act.amount}@${m}`;
    }

    return Response.json({ reply: parsed.reply, ui_action: parsed.ui_action || null, chart: parsed.chart || null, action_result: actionResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});