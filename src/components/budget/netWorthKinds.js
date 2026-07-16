export const NW_KINDS = {
  cash:       { label: 'Cash & Bank',  emoji: '💵', color: '#10b981' },
  investment: { label: 'Investments', emoji: '📈', color: '#3b82f6' },
  property:   { label: 'Property',    emoji: '🏠', color: '#f59e0b' },
  pension:    { label: 'Pension',     emoji: '🏦', color: '#8b5cf6' },
  vehicle:    { label: 'Vehicles',    emoji: '🚗', color: '#06b6d4' },
  other:      { label: 'Other',       emoji: '📦', color: '#64748b' },
  debt:       { label: 'Debts',       emoji: '💳', color: '#f43f5e' }
};

export const itemILS = (i) =>
  (i.currency === 'USD' ? i.value * (i.exchange_rate || 3.7) : i.value);

export const signedILS = (i) => (i.kind === 'debt' ? -1 : 1) * itemILS(i);