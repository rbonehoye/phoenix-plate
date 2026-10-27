export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Local calendar date as YYYY-MM-DD
export const dateKey = (d = new Date()) => d.toLocaleDateString('en-CA');

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 864e5);

// Monday-to-Sunday week containing `key`
export function weekOf(key) {
  const offset = (keyToDate(key).getDay() + 6) % 7;
  const monday = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return keyToDate(key).toLocaleDateString(undefined, opts);
}

export const fmt = (n) => Math.round(n ?? 0).toLocaleString();

// Grams for an entry, or a dash when the food has no value for it
export const grams = (v, servings = 1) => (v == null ? '–' : Math.round(v * servings));

// Same, with a unit, e.g. "12g" (no unit after a dash)
export const amount = (v, servings, unit) => (v == null ? '–' : `${Math.round(v * servings)}${unit}`);

// Entry nutrients are stored per serving; scale by the servings eaten.
export function totals(entries = []) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    for (const k of Object.keys(t)) t[k] += (e[k] ?? 0) * e.servings;
  }
  return t;
}

export function mealForPeriod(name = '') {
  const n = name.toLowerCase();
  if (n.includes('breakfast') || n.includes('brunch')) return 'Breakfast';
  if (n.includes('light lunch')) return 'Snacks';
  if (n.includes('lunch')) return 'Lunch';
  if (n.includes('dinner')) return 'Dinner';
  return 'Snacks';
}

export function mealForTime(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snacks';
}

// Older entries only stored the dining hall's period name.
export const entryMeal = (e) => e.meal ?? mealForPeriod(e.period);

// Pick the meal period happening now, else the next one today, else the last.
export function currentPeriodIndex(periods, now = new Date()) {
  if (!periods.length) return 0;
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = periods.findIndex((p) => p.start != null && p.end != null && mins >= p.start && mins <= p.end);
  if (open >= 0) return open;
  const next = periods.findIndex((p) => p.start != null && p.start > mins);
  return next >= 0 ? next : periods.length - 1;
}

// Consecutive days with something logged, ending today (or yesterday if today is empty so far)
export function streak(log, today) {
  let d = log[today]?.length ? today : addDays(today, -1);
  let n = 0;
  while (log[d]?.length) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export const capitalize = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
