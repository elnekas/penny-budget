// Financial super-groups for RiseUp categories (advisor-style framework)
export const GROUPS = {
  income:    { label: 'Income',              emoji: '💰', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  housing:   { label: 'Housing & Bills',     emoji: '🏠', bar: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700' },
  food:      { label: 'Food & Groceries',    emoji: '🛒', bar: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700' },
  dining:    { label: 'Dining Out',          emoji: '🍽️', bar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700' },
  transport: { label: 'Transportation',      emoji: '🚗', bar: 'bg-indigo-500',  chip: 'bg-indigo-100 text-indigo-700' },
  health:    { label: 'Health & Pharmacy',   emoji: '💊', bar: 'bg-rose-500',    chip: 'bg-rose-100 text-rose-700' },
  kids:      { label: 'Kids & Education',    emoji: '🎓', bar: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700' },
  personal:  { label: 'Clothing & Personal', emoji: '👕', bar: 'bg-pink-500',    chip: 'bg-pink-100 text-pink-700' },
  lifestyle: { label: 'Lifestyle & Leisure', emoji: '🎬', bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 text-fuchsia-700' },
  giving:    { label: 'Giving & Tzedaka',    emoji: '🤝', bar: 'bg-teal-500',    chip: 'bg-teal-100 text-teal-700' },
  financial: { label: 'Fees & Financial',    emoji: '🏦', bar: 'bg-slate-500',   chip: 'bg-slate-200 text-slate-700' },
  other:     { label: 'Other',               emoji: '📦', bar: 'bg-stone-400',   chip: 'bg-stone-100 text-stone-600' }
};

export function groupForCategory(catName, isIncome) {
  if (isIncome) return 'income';
  const c = (catName || '').toLowerCase();
  if (/(grocer|makolet|supermarket|butcher|bakery|fruit|veg)/.test(c)) return 'food';
  if (/(restaurant|cafe|coffee|dining|eating|wolt|takeaway|fast food|pizza)/.test(c)) return 'dining';
  if (/(car|fuel|parking|transport|bus|train|taxi|rav kav)/.test(c)) return 'transport';
  if (/(pharma|health|medical|dental|doctor|kupat|optic)/.test(c)) return 'health';
  if (/(educat|school|tuition|gan|kid|child|camp|chug|babysit|toy)/.test(c)) return 'kids';
  if (/(cloth|footwear|shoe|beauty|cosmetic|barber|hair)/.test(c)) return 'personal';
  if (/(charity|tzedaka|donation|maaser)/.test(c)) return 'giving';
  if (/(wellness|gym|sport|fitness|spa|digital|subscription|stream|entertain|hobby|pet|vet|travel|vacation|hotel|flight)/.test(c)) return 'lifestyle';
  if (/(arnona|electric|water|rent|mortgage|vaad|city tax|phone|cell|internet|communi|municipal|home)/.test(c)) return 'housing';
  if (/(insurance|fee|atm|interest|loan|saving|invest|bank|payment)/.test(c)) return 'financial';
  return 'other';
}

export const INTERNAL_STRINGS = [
  'לאומי מאסטרקרד', 'כרטיסי אשראי', 'כרטיס דביט', 'מקס איט פינן', 'מקס איט',
  'העברה לח.נוסף', 'העברה מהחשבון', 'העברת משכור', 'המרת קן', 'המרה'
];

export function isInternal(name) {
  return !!name && INTERNAL_STRINGS.some(s => name.includes(s));
}

export const fmt = (n) => '₪' + Math.round(n).toLocaleString();