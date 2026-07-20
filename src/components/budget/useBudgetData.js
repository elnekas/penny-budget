import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRiseUpData } from '@/components/riseup/useRiseUpData';
import { countsInMonth, hasLanded, monthlyILSForMonth, bufferIncomeILSForMonth, isBuffer } from './externalIncomeUtils';

export function useBudgetData() {
  const qc = useQueryClient();
  const riseup = useRiseUpData();

  const extQ = useQuery({
    queryKey: ['external-income'],
    queryFn: () => base44.entities.ExternalIncome.list('-created_date', 100)
  });
  const goalsQ = useQuery({
    queryKey: ['category-goals'],
    queryFn: () => base44.entities.CategoryGoal.list('-created_date', 300)
  });
  const transfersQ = useQuery({
    queryKey: ['deposit-transfers'],
    queryFn: () => base44.entities.DepositTransfer.list('-created_date', 500)
  });
  const bufferPlanQ = useQuery({
    queryKey: ['buffer-plan'],
    queryFn: () => base44.entities.BufferPlan.list('-created_date', 1)
  });

  const saveBufferDraw = useMutation({
    mutationFn: async (monthly_draw_ils) => {
      const existing = bufferPlanQ.data?.[0];
      if (existing) return base44.entities.BufferPlan.update(existing.id, { monthly_draw_ils });
      return base44.entities.BufferPlan.create({ monthly_draw_ils });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buffer-plan'] })
  });

  const saveExternal = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.ExternalIncome.update(id, data)
      : base44.entities.ExternalIncome.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-income'] })
  });
  const deleteExternal = useMutation({
    mutationFn: (id) => base44.entities.ExternalIncome.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-income'] })
  });
  const saveTransfer = useMutation({
    mutationFn: (data) => base44.entities.DepositTransfer.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposit-transfers'] })
  });
  const deleteTransfer = useMutation({
    mutationFn: (id) => base44.entities.DepositTransfer.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposit-transfers'] })
  });
  const updateTransfer = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DepositTransfer.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deposit-transfers'] })
  });
  const saveGoal = useMutation({
    mutationFn: async ({ category, monthly_target }) => {
      const existing = (goalsQ.data || []).find(g => g.category === category);
      if (existing) return base44.entities.CategoryGoal.update(existing.id, { monthly_target });
      return base44.entities.CategoryGoal.create({ category, monthly_target });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category-goals'] })
  });
  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.CategoryGoal.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category-goals'] })
  });

  // ---- Monthly aggregation from RiseUp transactions ----
  const months = riseup.snapshot?.months || [];
  const monthly = {};
  months.forEach(m => { monthly[m] = { income: 0, fixed: 0, variable: 0, planned: 0, categories: {} }; });
  riseup.transactions.forEach(t => {
    if (t.ignored || t.internal) return;
    const s = monthly[t.m];
    if (!s) return;
    if (t.inc) s.income += t.amt;
    else if (t.planned) s.planned += t.amt; // outstanding planned — tallies against savings, not the month
    else if (t.fixed) s.fixed += t.amt;
    else {
      s.variable += t.amt;
      s.categories[t.category] = (s.categories[t.category] || 0) + t.amt;
    }
  });

  // ---- External (USD) income converted to monthly ILS ----
  const externals = extQ.data || [];
  const transfers = transfersQ.data || [];
  const bufferDraw = bufferPlanQ.data?.[0]?.monthly_draw_ils || 0;
  const externalForMonth = (month) => {
    let spend = 0, reinvest = 0;
    externals.filter(e => !isBuffer(e) && countsInMonth(e, month, transfers) && hasLanded(e, month, transfers)).forEach(e => {
      const mILS = monthlyILSForMonth(e, month, transfers);
      const pct = (e.spend_pct ?? 40) / 100;
      spend += mILS * pct;
      reinvest += mILS * (1 - pct);
    });
    // Buffer pool: actual draws for past months, planned monthly draw for current & future
    const buffer = bufferIncomeILSForMonth(externals, month, transfers, bufferDraw);
    return { spend, reinvest, buffer };
  };

  // ---- 3-month category averages (excluding the current partial month) ----
  const fullMonths = months.slice(0, -1);
  const avgMonths = fullMonths.slice(-3);
  const categoryAvg = {};
  avgMonths.forEach(m => {
    Object.entries(monthly[m]?.categories || {}).forEach(([c, v]) => {
      categoryAvg[c] = (categoryAvg[c] || 0) + v;
    });
  });
  Object.keys(categoryAvg).forEach(c => { categoryAvg[c] = categoryAvg[c] / (avgMonths.length || 1); });

  return {
    ...riseup,
    months,
    monthly,
    categoryAvg,
    externals,
    externalForMonth,
    transfers,
    bufferDraw,
    saveBufferDraw,
    goals: goalsQ.data || [],
    saveExternal,
    deleteExternal,
    saveTransfer,
    deleteTransfer,
    updateTransfer,
    saveGoal,
    deleteGoal,
    loadingBudget: riseup.loading || extQ.isLoading || goalsQ.isLoading || transfersQ.isLoading || bufferPlanQ.isLoading
  };
}