import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { groupForCategory, isInternal } from './riseupGroups';

export const RISEUP_DATA_URL = 'https://golem-ab6b7215.base44.app/functions/financeSnapshot';

export function useRiseUpData() {
  const queryClient = useQueryClient();

  const snapshotQ = useQuery({
    queryKey: ['riseup-snapshot'],
    queryFn: async () => {
      const res = await fetch(RISEUP_DATA_URL);
      if (!res.ok) throw new Error('Failed to load RiseUp data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always'
  });

  const overridesQ = useQuery({
    queryKey: ['riseup-overrides'],
    queryFn: () => base44.entities.RiseUpOverride.list('-created_date', 2000)
  });

  const renamesQ = useQuery({
    queryKey: ['riseup-renames'],
    queryFn: () => base44.entities.RiseUpCategoryRename.list('-created_date', 500)
  });

  const groupOverridesQ = useQuery({
    queryKey: ['riseup-cat-groups'],
    queryFn: () => base44.entities.RiseUpCategoryGroup.list('-created_date', 500)
  });

  const inclusionsQ = useQuery({
    queryKey: ['internal-inclusions'],
    queryFn: () => base44.entities.InternalInclusion.list('-created_date', 500)
  });

  const saveCategoryGroup = useMutation({
    mutationFn: async ({ category, group }) => {
      const existing = (groupOverridesQ.data || []).find(g => g.category_name === category);
      if (existing) return base44.entities.RiseUpCategoryGroup.update(existing.id, { group });
      return base44.entities.RiseUpCategoryGroup.create({ category_name: category, group });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riseup-cat-groups'] })
  });

  const saveCategoryForName = useMutation({
    mutationFn: async ({ name, category }) => {
      const txIds = (snapshotQ.data?.transactions || []).filter(t => t.name === name).map(t => t.id);
      const overrides = overridesQ.data || [];
      const updates = [];
      const creates = [];
      txIds.forEach(id => {
        const existing = overrides.find(o => o.tx_id === id);
        if (existing) updates.push({ id: existing.id, category });
        else creates.push({ tx_id: id, category });
      });
      if (updates.length) await base44.entities.RiseUpOverride.bulkUpdate(updates);
      if (creates.length) await base44.entities.RiseUpOverride.bulkCreate(creates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riseup-overrides'] })
  });

  const saveRename = useMutation({
    mutationFn: async ({ oldName, newName }) => {
      const renames = renamesQ.data || [];
      const existing = renames.find(r => r.new_name === oldName) || renames.find(r => r.old_name === oldName);
      if (existing) return base44.entities.RiseUpCategoryRename.update(existing.id, { new_name: newName });
      return base44.entities.RiseUpCategoryRename.create({ old_name: oldName, new_name: newName });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riseup-renames'] })
  });

  const saveOverride = useMutation({
    mutationFn: async ({ txId, changes }) => {
      const existing = (overridesQ.data || []).find(o => o.tx_id === txId);
      if (existing) return base44.entities.RiseUpOverride.update(existing.id, changes);
      return base44.entities.RiseUpOverride.create({ tx_id: txId, ...changes });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riseup-overrides'] })
  });

  const snapshot = snapshotQ.data;
  let transactions = [];
  if (snapshot) {
    // Newest override wins (list is sorted newest-first)
    const ovMap = new Map();
    (overridesQ.data || []).forEach(o => {
      if (!ovMap.has(o.tx_id)) ovMap.set(o.tx_id, o);
    });
    const dupCount = {};
    snapshot.transactions.forEach(t => {
      const k = t.name + '|' + t.amt + '|' + t.td;
      dupCount[k] = (dupCount[k] || 0) + 1;
    });
    const renameMap = new Map();
    (renamesQ.data || []).forEach(r => {
      if (!renameMap.has(r.old_name)) renameMap.set(r.old_name, r.new_name);
    });
    const groupMap = new Map();
    (groupOverridesQ.data || []).forEach(g => {
      if (!groupMap.has(g.category_name)) groupMap.set(g.category_name, g.group);
    });
    const includedSet = new Set((inclusionsQ.data || []).map(r => r.name));
    transactions = snapshot.transactions.map(t => {
      const ov = ovMap.get(t.id);
      let category = ov?.category || t.catName || 'General';
      category = renameMap.get(category) || category;
      return {
        ...t,
        category,
        group: t.inc ? 'income' : (groupMap.get(category) || groupForCategory(category, t.inc)),
        // Excluded as an internal transfer/settlement everywhere — unless explicitly included back
        internal: isInternal(t.name) && !includedSet.has(t.name),
        ignored: !!ov?.ignored,
        planned: !!ov?.planned,
        hasOverride: !!ov?.category,
        possibleDuplicate: dupCount[t.name + '|' + t.amt + '|' + t.td] > 1
      };
    });
  }

  return {
    snapshot,
    transactions,
    loading: snapshotQ.isLoading || overridesQ.isLoading || renamesQ.isLoading || inclusionsQ.isLoading,
    error: snapshotQ.error,
    saveOverride,
    saveRename,
    saveCategoryForName,
    saveCategoryGroup,
    refresh: snapshotQ.refetch,
    isRefreshing: snapshotQ.isRefetching
  };
}