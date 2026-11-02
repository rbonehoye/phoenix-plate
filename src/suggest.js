// Suggested plates from today's dining hall menus: a protein, a carb side and
// a vegetable, sized to what's left of the day's calories and protein.
// Items are sorted into roles by their macros, not their names, so this works
// on whatever the halls serve that day.

import { MEALS, entryMeal, mealForPeriod, totals } from './utils.js';

const MAIN_MEALS = ['Breakfast', 'Lunch', 'Dinner'];
// Usual share of the day's calories and protein for each meal.
const SHARE = { Breakfast: 0.25, Lunch: 0.3, Dinner: 0.3, Snacks: 0.15 };
const MAX_OVER_SHARE = 1.3; // a meal can run up to 30% over its usual share to catch up
const MAX_SERVINGS = 3;
const MAX_SIDE_SERVINGS = 2; // three dinner rolls reads like a mistake; add a second side instead

// Toppings, drinks and pantry shelves aren't sides; gluten-free stand-ins
// duplicate the regular item.
const SKIP_STATION = /condiment|addition|topping|hydration|beverage|pantry|dessert|sweet/i;
const SKIP_NAME = /made without gluten|dressing|sauce|syrup|gravy/i;
const BREAD = /\bbun|roll\b|bread|pita|wrap|tortilla|bagel|biscuit|toast|naan|flatbread|croissant/i;
const BREAKFAST_ONLY =/bagel|waffle|pancake|cereal|oat|muffin|biscuit|french toast|granola|crunch|puffs|grits/i;

const kcal = (it) => it.calories || 1;
const isProtein = (it) => it.protein >= 12 && (it.protein * 4) / kcal(it) >= 0.3;
const isCarb = (it) =>
  it.calories >= 80 && (it.carbs * 4) / kcal(it) >= 0.5 && it.protein < 10 && (it.sugar ?? 0) <= it.carbs * 0.35;
const isVeg = (it) => it.calories <= 150 && (it.fiber ?? 0) >= 2 && it.protein < 10 && (it.sugar ?? 0) < 10 && !isCarb(it);
// Milk and yogurt: an easy protein top-up when the plate falls short.
const isDairy = (it) => /\bmilk\b|yogurt/i.test(it.name) && it.protein >= 7 && it.calories <= 200;

// The next main meal today that has nothing logged yet, from the current one on.
export function nextMeal(entries, current) {
  const from = Math.max(0, MAIN_MEALS.indexOf(current));
  if (current === 'Snacks') return null;
  return MAIN_MEALS.slice(from).find((m) => !entries.some((e) => entryMeal(e) === m)) ?? null;
}

// Calories and protein for one meal: what's left today, split over this meal,
// the later main meals and snacks by their usual share of the day. Capped so
// a day with nothing logged (or a skipped lunch) doesn't produce one giant plate.
export function mealBudget(targets, entries, meal) {
  const eaten = totals(entries);
  const later = MAIN_MEALS.slice(MAIN_MEALS.indexOf(meal) + 1).filter((m) => !entries.some((e) => entryMeal(e) === m));
  const share = SHARE[meal] / (SHARE[meal] + later.reduce((s, m) => s + SHARE[m], 0) + SHARE.Snacks);
  const portion = (key, floor) =>
    Math.max(floor, Math.min((targets[key] - eaten[key]) * share, targets[key] * SHARE[meal] * MAX_OVER_SHARE));
  return { calories: portion('calories', 300), protein: portion('protein', 20) };
}

// The main period for a meal at a hall ("Lunch" before "Light Lunch").
function periodFor(hall, meal) {
  const matches = hall.periods.filter((p) => mealForPeriod(p.name) === meal);
  return matches.find((p) => p.name === meal) ?? matches[0] ?? null;
}

// Each item once, tagged with its station, and flagged when it can only be a
// drink or add-on rather than part of the plate.
function uniqueItems(period) {
  const seen = new Map();
  for (const s of period.stations) {
    for (const it of s.items) {
      if (!(it.calories > 0) || seen.has(it.name)) continue;
      seen.set(it.name, { ...it, station: s.name, plate: !SKIP_STATION.test(s.name) && !SKIP_NAME.test(it.name) });
    }
  }
  return [...seen.values()];
}

// The side whose servings land closest to the calories still free.
function fitSide(sides, room, used) {
  let best = null;
  for (const c of sides) {
    if (used.has(c.name) || room < c.calories * 0.5) continue;
    const servings = Math.min(MAX_SIDE_SERVINGS, clampServings(room / c.calories));
    const miss = Math.abs(room - c.calories * servings);
    if (!best || miss < best.miss) best = { item: c, servings, miss };
  }
  return best;
}

const sum = (parts) => {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const { item, servings } of parts) for (const k of Object.keys(t)) t[k] += (item[k] ?? 0) * servings;
  return t;
};

// Lower is better: distance from the calorie budget, plus a heavier penalty
// for falling short on protein.
function score(t, budget) {
  return Math.abs(t.calories - budget.calories) / budget.calories + (Math.max(0, budget.protein - t.protein) / budget.protein) * 1.5;
}

const clampServings = (n) => Math.min(MAX_SERVINGS, Math.max(1, Math.round(n)));

function bestPlate(items, meal, budget, avoid) {
  const onPlate = items.filter((it) => it.plate);
  const proteins = onPlate.filter(isProtein).filter((it) => !avoid.has(it.name));
  const carbs = onPlate.filter((it) => isCarb(it) && (meal === 'Breakfast' || !BREAKFAST_ONLY.test(it.name)));
  const veg = onPlate.filter(isVeg).sort((a, b) => (b.fiber ?? 0) - (a.fiber ?? 0))[0];
  const dairy = items.filter(isDairy).sort((a, b) => b.protein - a.protein)[0];
  let best = null;

  for (const p of proteins) {
    const parts = [{ item: p, servings: clampServings((budget.protein * 0.8) / p.protein) }];
    if (veg) parts.push({ item: veg, servings: 1 });
    const options = carbs.length ? carbs : [null];
    for (const c of options) {
      const plate = [...parts];
      if (c && budget.calories - sum(plate).calories > c.calories * 0.5) {
        const servings = Math.min(MAX_SIDE_SERVINGS, clampServings((budget.calories - sum(plate).calories) / c.calories));
        plate.push({ item: c, servings });
        // Still well short: add a second side of another kind, from another station (not a bun and a roll).
        const others = carbs.filter((x) => x.station !== c.station && !(BREAD.test(x.name) && BREAD.test(c.name)));
        const second = fitSide(others, budget.calories - sum(plate).calories, new Set([c.name]));
        if (second && budget.calories - sum(plate).calories > 150) plate.push({ item: second.item, servings: second.servings });
      }
      if (dairy && sum(plate).protein < budget.protein * 0.85) plate.push({ item: dairy, servings: 1 });
      const t = sum(plate);
      const s = score(t, budget);
      if (!best || s < best.score) best = { parts: plate, totals: t, score: s };
    }
  }
  return best;
}

// Up to `limit` plates for `meal`, at most one per hall and each with a
// different protein, best fit first.
export function suggestMeals(menus, meal, budget, limit = 3) {
  if (!menus?.halls || !MEALS.includes(meal)) return [];
  const avoid = new Set();
  const plates = [];
  const halls = menus.halls
    .map((hall) => ({ hall, period: periodFor(hall, meal) }))
    .filter((h) => h.period)
    .map((h) => ({ ...h, plate: bestPlate(uniqueItems(h.period), meal, budget, new Set()) }))
    .filter((h) => h.plate)
    .sort((a, b) => a.plate.score - b.plate.score);

  for (const { hall, period } of halls) {
    const plate = bestPlate(uniqueItems(period), meal, budget, avoid);
    if (!plate) continue;
    avoid.add(plate.parts[0].item.name);
    plates.push({ hall, period, ...plate });
    if (plates.length === limit) break;
  }
  return plates;
}
