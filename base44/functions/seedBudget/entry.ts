import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // 1. Delete ALL existing Budget records where month = "2025-12"
    let deletedCount = 0;
    while (true) {
      const toDelete = await base44.asServiceRole.entities.Budget.filter({ month: "2025-12" });
      if (toDelete.length === 0) break;
      await base44.asServiceRole.entities.Budget.deleteMany({ month: "2025-12" });
      deletedCount += toDelete.length;
    }

    // 2. Create new Budgets
    const budgetsToCreate = [
      { category: "mortgage", monthly_limit: 5500, expense_type: "fixed" },
      { category: "car_payment", monthly_limit: 1800, expense_type: "fixed" },
      { category: "insurance", monthly_limit: 800, expense_type: "fixed" },
      { category: "tuition", monthly_limit: 2000, expense_type: "fixed" },
      { category: "kids_allowance", monthly_limit: 1255, expense_type: "fixed" },
      { category: "phone_internet", monthly_limit: 400, expense_type: "fixed" },
      { category: "electricity_water", monthly_limit: 600, expense_type: "fixed" },
      { category: "arnona", monthly_limit: 493, expense_type: "fixed" },
      { category: "credit_card_payment", monthly_limit: 6500, expense_type: "fixed" },
      
      { category: "groceries", monthly_limit: 4500, expense_type: "variable" },
      { category: "transport", monthly_limit: 1200, expense_type: "variable" },
      { category: "fuel", monthly_limit: 800, expense_type: "variable" },
      { category: "clothing", monthly_limit: 500, expense_type: "variable" },
      { category: "health", monthly_limit: 300, expense_type: "variable" },
      { category: "food", monthly_limit: 600, expense_type: "variable" },
      { category: "entertainment", monthly_limit: 400, expense_type: "variable" },
      { category: "household", monthly_limit: 500, expense_type: "variable" },
      
      { category: "maaser", monthly_limit: 1500, expense_type: "variable" },
      
      { category: "income", monthly_limit: 999999, expense_type: "fixed" }
    ];

    const bulkPayload = budgetsToCreate.map(b => ({
      month: "2026-06",
      account_owner: "danny.ayelet@gmail.com",
      alert_threshold: 80,
      category: b.category,
      monthly_limit: b.monthly_limit
      // Note: Budget schema doesn't have expense_type field, so we just supply the required schema fields
    }));

    await base44.asServiceRole.entities.Budget.bulkCreate(bulkPayload);

    return Response.json({ deleted: deletedCount, created: bulkPayload.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});