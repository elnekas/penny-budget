import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  runQuery, loadFinanceData, computeExternalIncome, computePlannerState, executeAction
} from '../../shared/pennyCore.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return Response.json({ error: 'messages required' }, { status: 400 });
    }

    const data = await loadFinanceData(base44);
    const { snapshot, externals, goals, transfers, plans, ovMap, months, monthly, allTxs } = data;

    const planner = computePlannerState(allTxs, months, plans);
    const nowMonth = planner.nowMonth;
    const { extLines, bufferLines, extSpend, extReinvest, bufferDraw } = computeExternalIncome(externals, transfers, nowMonth);

    // Compact data summary for the model
    const monthTable = months.map((m) => {
      const s = monthly[m];
      return `${m}: income ₪${Math.round(s.income)}, fixed ₪${Math.round(s.fixed)}, variable ₪${Math.round(s.variable)}`;
    }).join('\n');

    const recentMonths = months.slice(-4);
    const catTotals = {};
    recentMonths.forEach((m) => Object.entries(monthly[m].categories).forEach(([c, v]) => { catTotals[c] = (catTotals[c] || 0) + v; }));
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 18);
    const catTable = topCats.map(([c]) =>
      `${c}: ` + recentMonths.map((m) => `${m}=₪${Math.round(monthly[m].categories[c] || 0)}`).join(', ')
    ).join('\n');

    const goalLines = goals.map((g) => `- ${g.category}: ceiling ₪${g.monthly_target}/mo`).join('\n') || 'No category goals set yet.';

    const plannerLines = planner.groups.map((g) =>
      `- ${g.group} (${g.label}): budgeted ₪${g.budgeted}${g.explicitly_set ? '' : ' (default = avg, not explicitly set)'}, spent so far ₪${g.spent}, expected fixed still to come ₪${g.expected_fixed_still_to_come}${g.expected_fixed_items.length ? ` (${g.expected_fixed_items.join(', ')})` : ''}, remaining ₪${g.remaining}, 6-mo avg ₪${g.avg_6mo}`
    ).join('\n');
    const otherPlans = planner.other_plans.map((p) =>
      `- ${p.month}: goal ₪${p.budget_goal ?? '—'}, allocations ${JSON.stringify(p.allocations)}`
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

BUDGET PLANNING ZONE (current month ${nowMonth}) — the user's live plan. Allocations are per GROUP (use the exact group ids below). Overall budget goal this month: ${planner.budget_goal ? `₪${planner.budget_goal}` : 'not set'}.
${plannerLines || 'No planner data yet.'}
${otherPlans ? `Saved plans for other months:\n${otherPlans}` : ''}
When the user asks "how much is left for X this month", map X to its group (e.g. clothing → personal, restaurants → dining, groceries → food) and answer with budgeted, spent, and remaining from the planner state above. "Remaining" already subtracts BOTH what was spent AND recurring fixed bills expected but not yet charged this month — mention the upcoming bills when relevant.

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
    const actionResult = parsed.action
      ? await executeAction(base44, parsed.action, { goals, plans, snapshot, ovMap })
      : null;

    return Response.json({ reply: parsed.reply, ui_action: parsed.ui_action || null, chart: parsed.chart || null, action_result: actionResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});