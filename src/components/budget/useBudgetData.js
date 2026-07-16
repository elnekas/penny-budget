import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRiseUpData } from '@/components/riseup/useRiseUpData';
import { isInternal } from '@/components/riseup/riseupGroups';

const FREQ_DIV = { monthly: 1, quarterly: 3, yearly: 12 };

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
  const saveGoal = useMutation({
    mutationFn: async ({ category, monthly_target }) => {
      const existing = (goalsQ.data || []).find(g => g.category === category);
      if (existing) return base44.entities.CategoryGoal.update(existing.id, { monthly_target });
      return base44.entities.CategoryGoal.create({ category, monthly_target });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['category-goals'] })
  });

  // ---- Monthly aggregation from RiseUp transactions ----
  const months = riseup.snapshot?.months || [];
  const monthly = {};
  months.forEach(m => { monthly[m] = { income: 0, fixed: 0, variable: 0, categories: {} }; });
  riseup.transactions.forEach(t => {
    if (t.ignored || isInternal(t.name)) return;
    const s = monthly[t.m];
    if (!s) return;
    if (t.inc) s.income += t.amt;
    else if (t.fixed) s.fixed += t.amt;
    else {
      s.variable += t.amt;
      s.categories[t.category] = (s.categories[t.category] || 0) + t.amt;
    }
  });

  // ---- External (USD) income converted to monthly ILS ----
  const externals = extQ.data || [];
  let externalSpendILS = 0, externalReinvestILS = 0;
  externals.filter(e => e.active !== false).forEach(e => {
    const monthlyILS = (e.amount_usd * (e.exchange_rate || 3.7)) / (FREQ_DIV[e.frequency] || 1);
    const pct = (e.spend_pct ?? 40) / 100;
    externalSpendILS += monthlyILS * pct;
    externalReinvestILS += monthlyILS * (1 - pct);
  });

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
    externalSpendILS,
    externalReinvestILS,
    goals: goalsQ.data || [],
    saveExternal,
    deleteExternal,
    saveGoal,
    loadingBudget: riseup.loading || extQ.isLoading || goalsQ.isLoading
  };
}