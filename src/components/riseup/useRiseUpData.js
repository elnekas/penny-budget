import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { groupForCategory } from './riseupGroups';

export const RISEUP_DATA_URL = 'https://media.base44.com/files/public/69b7ce97ba10383cab6b7215/5e2b6fe26_finance_snapshot.json';

export function useRiseUpData() {
  const queryClient = useQueryClient();

  const snapshotQ = useQuery({
    queryKey: ['riseup-snapshot'],
    queryFn: async () => {
      const res = await fetch(RISEUP_DATA_URL);
      if (!res.ok) throw new Error('Failed to load RiseUp data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000
  });

  const overridesQ = useQuery({
    queryKey: ['riseup-overrides'],
    queryFn: () => base44.entities.RiseUpOverride.list('-created_date', 2000)
  });

  const renamesQ = useQuery({
    queryKey: ['riseup-renames'],
    queryFn: () => base44.entities.RiseUpCategoryRename.list('-created_date', 500)
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
    transactions = snapshot.transactions.map(t => {
      const ov = ovMap.get(t.id);
      let category = ov?.category || t.catName || 'General';
      category = renameMap.get(category) || category;
      return {
        ...t,
        category,
        group: groupForCategory(category, t.inc),
        ignored: !!ov?.ignored,
        hasOverride: !!ov?.category,
        possibleDuplicate: dupCount[t.name + '|' + t.amt + '|' + t.td] > 1
      };
    });
  }

  return {
    snapshot,
    transactions,
    loading: snapshotQ.isLoading || overridesQ.isLoading || renamesQ.isLoading,
    error: snapshotQ.error,
    saveOverride,
    saveRename
  };
}