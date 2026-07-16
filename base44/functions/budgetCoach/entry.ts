import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SNAPSHOT_URL = 'https://golem-ab6b7215.base44.app/functions/financeSnapshot';
const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];
const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return Response.json({ error: 'messages required' }, { status: 400 });
    }

    const [snapRes, externals, goals, overrides, renames] = await Promise.all([
      fetch(SNAPSHOT_URL),
      base44.entities.ExternalIncome.list('-created_date', 100),
      base44.entities.CategoryGoal.list('-created_date', 300),
      base44.entities.RiseUpOverride.list('-created_date', 2000),
      base44.entities.RiseUpCategoryRename.list('-created_date', 500)
    ]);
    const snapshot = await snapRes.json();

    // Resolve categories the same way the frontend does
    const ovMap = new Map();
    overrides.forEach((o) => { if (!ovMap.has(o.tx_id)) ovMap.set(o.tx_id, o); });
    const renameMap = new Map();
    renames.forEach((r) => { if (!renameMap.has(r.old_name)) renameMap.set(r.old_name, r.new_name); });

    const months = snapshot.months || [];
    const monthly: Record<string, { income: number; fixed: number; variable: number; categories: Record<string, number> }> = {};
    months.forEach((m) => { monthly[m] = { income: 0, fixed: 0, variable: 0, categories: {} }; });

    (snapshot.transactions || []).forEach((t) => {
      const ov = ovMap.get(t.id);
      if (ov?.ignored) return;
      if (t.name && INTERNAL_STRINGS.some((s) => t.name.includes(s))) return;
      const s = monthly[t.m];
      if (!s) return;
      let cat = ov?.category || t.catName || 'General';
      cat = renameMap.get(cat) || cat;
      if (t.inc) s.income += t.amt;
      else if (t.fixed) s.fixed += t.amt;
      else { s.variable += t.amt; s.categories[cat] = (s.categories[cat] || 0) + t.amt; }
    });

    // External USD income
    let extSpend = 0, extReinvest = 0;
    const nowMonth = new Date().toISOString().slice(0, 7);
    const extLines = externals.filter((e) => e.active !== false).map((e) => {
      const monthlyILS = (e.amount_usd * (e.exchange_rate || 3.7)) / (FREQ_DIV[e.frequency] || 1);
      const pct = (e.spend_pct ?? 40) / 100;
      const started = (!e.start_date || e.start_date.slice(0, 7) <= nowMonth) && (!e.end_date || e.end_date.slice(0, 7) >= nowMonth);
      if (started) {
        extSpend += monthlyILS * pct;
        extReinvest += monthlyILS * (1 - pct);
      }
      return `- ${e.source_name}: $${e.amount_usd} ${e.frequency} @ rate ${e.exchange_rate || 3.7} → ₪${Math.round(monthlyILS)}/mo (${e.spend_pct ?? 40}% spendable)${e.start_date ? `, started ${e.start_date}` : ''}${e.end_date ? `, ends ${e.end_date}` : ''}${e.deposit_day ? `, lands on day ${e.deposit_day}` : ''}${started ? '' : ' — NOT ACTIVE THIS MONTH, excluded from totals'}`;
    });

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

    const systemPrompt = `You are Penny, a warm, sharp personal-finance coach. You blend Dave Ramsey's discipline (every shekel has a job, attack fixed costs) with Tony Robbins' growth mindset (focus on freedom, momentum, and goals). The user follows a Growth + Goal-Based methodology: proportional buckets plus per-category variable-spend ceilings.

You are embedded in the user's live "Budget Cockpit" dashboard and can CONTROL the UI. Currency is ₪ (ILS). The last month in the data is the current, partial month.

USER'S LIVE DATA:
Monthly overview:
${monthTable}

Variable spending by category (last ${recentMonths.length} months, exact category names — use them verbatim):
${catTable}

Overseas USD income (already part of the budget; spendable portion adds ₪${Math.round(extSpend)}/mo to income, ₪${Math.round(extReinvest)}/mo goes to reinvestment):
${extLines.join('\n') || 'None configured.'}

Category goals:
${goalLines}

RESPONSE FORMAT — always return ONLY valid JSON:
{"reply": "your coaching message in markdown (concise, specific numbers, encouraging, 1-2 emojis max)", "ui_action": <action or null>, "action": <action or null>}

ui_action lets you show things on the dashboard. Use it whenever you discuss specific categories or months:
- {"type":"focus_category","category":"<exact category name>","months":["YYYY-MM"]} — spotlight one category for one month (or 2-4 months side by side for comparison)
- {"type":"compare_chart","category":"<exact category name>","months":["YYYY-MM",...]} — bar chart of a category across months
- {"type":"show_gauge","month":"YYYY-MM"} — point at the Freedom Gauge for a month
- {"type":"reset"} — clear the spotlight
Use null for general strategy talk with no specific visual. Month codes and category names must match the data exactly.

"action" lets you MAKE REAL CHANGES to the user's data. Use it ONLY when the user clearly asks for a change, and confirm exactly what you did in your reply:
- {"type":"set_goal","category":"<exact category name from the data>","monthly_target":<number, ILS>} — set or update a monthly spending ceiling (e.g. "Cap dining at 1500")
- {"type":"add_external_income","source_name":"<name>","amount_usd":<number>,"frequency":"monthly"|"quarterly"|"yearly","exchange_rate":<number, optional>,"spend_pct":<0-100, optional, % spendable>,"start_date":"YYYY-MM-DD" (optional, when it begins),"end_date":"YYYY-MM-DD" (optional, when it ends),"deposit_day":<1-31, optional, day of month it lands>} — add an overseas income source
- {"type":"recategorize_merchant","merchant":"<merchant name as it appears in transactions>","category":"<target category>"} — move ALL of that merchant's transactions to a category
If the request is ambiguous (unknown category or merchant), ask for clarification in your reply instead of acting. Use null when no change is requested.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6 }
        })
      }
    );
    const gj = await geminiRes.json();
    const text = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (_e) {
      parsed = { reply: text || "I couldn't process that — try rephrasing?", ui_action: null };
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
        frequency: FREQ_DIV[act.frequency] ? act.frequency : 'monthly',
        exchange_rate: act.exchange_rate || 3.7,
        spend_pct: act.spend_pct ?? 40,
        active: true,
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
    }

    return Response.json({ reply: parsed.reply, ui_action: parsed.ui_action || null, action_result: actionResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});