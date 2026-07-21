// Penny's budget toolbox for the WhatsApp/Telegram agent — same brain as the dashboard chat.
// action: "planner_state" | "query" | "set_plan_allocation" | "set_budget_goal" | "set_goal" | "add_external_income" | "recategorize_merchant"
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  loadFinanceData, computePlannerState, computeExternalIncome, runQuery, executeAction
} from '../../shared/pennyCore.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action;
    const data = await loadFinanceData(base44);

    if (action === 'planner_state') {
      const state = computePlannerState(data.allTxs, data.months, data.plans);
      const ext = computeExternalIncome(data.externals, data.transfers, state.nowMonth);
      return Response.json({
        ...state,
        note: 'Amounts in ILS. "remaining" per group already subtracts both spent and recurring fixed bills expected but not yet charged this month.',
        category_goals: data.goals.map((g) => ({ category: g.category, monthly_target: g.monthly_target })),
        external_income: {
          spendable_ils_per_month: Math.round(ext.extSpend),
          reinvested_ils_per_month: Math.round(ext.extReinvest),
          buffer_draw_ils_this_month: Math.round(ext.bufferDraw),
          sources: ext.extLines,
          buffers: ext.bufferLines
        }
      });
    }

    if (action === 'query') {
      return Response.json(runQuery(data.allTxs, body.query || body));
    }

    const result = await executeAction(base44, { ...body, type: action }, data);
    if (!result) {
      return Response.json({ error: 'Unknown action or missing/invalid parameters', action: action || null }, { status: 400 });
    }
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});