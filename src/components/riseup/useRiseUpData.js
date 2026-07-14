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
    transactions = snapshot.transactions.map(t => {
      const ov = ovMap.get(t.id);
      const category = ov?.category || t.catName || 'General';
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
    loading: snapshotQ.isLoading || overridesQ.isLoading,
    error: snapshotQ.error,
    saveOverride
  };
}