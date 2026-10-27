export const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat'];

// Local calendar date as YYYY-MM-DD
export const dateKey = (d = new Date()) => d.toLocaleDateString('en-CA');

export function formatDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}

export const round = (n) => (n == null ? null : Math.round(n));

// Entry nutrients are stored per serving; scale by the servings eaten.
export function totals(entries) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    for (const k of NUTRIENTS) t[k] += (e[k] ?? 0) * e.servings;
  }
  return t;
}

// Pick the meal period happening now, else the next one today, else the last.
export function currentPeriodIndex(periods, now = new Date()) {
  if (!periods.length) return 0;
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = periods.findIndex((p) => p.start != null && p.end != null && mins >= p.start && mins <= p.end);
  if (open >= 0) return open;
  const next = periods.findIndex((p) => p.start != null && p.start > mins);
  return next >= 0 ? next : periods.length - 1;
}

export const capitalize = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
