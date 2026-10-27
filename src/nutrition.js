// Calorie and macro targets from body stats and goal.
// BMR uses the Mifflin-St Jeor equation; maintenance (TDEE) = BMR x activity.
// 1 lb of body weight ~ 3,500 cal, so 1 lb/week ~ 500 cal/day.

import { addDays, daysBetween } from './utils.js';

export const ACTIVITY = [
  { id: 'sedentary', label: 'Mostly sitting', detail: 'Little or no exercise', factor: 1.2 },
  { id: 'light', label: 'Lightly active', detail: 'Exercise 1–3 days a week', factor: 1.375 },
  { id: 'moderate', label: 'Moderately active', detail: 'Exercise 3–5 days a week', factor: 1.55 },
  { id: 'very', label: 'Very active', detail: 'Hard exercise 6–7 days a week', factor: 1.725 },
  { id: 'athlete', label: 'Athlete', detail: 'Training twice a day or a varsity sport', factor: 1.9 },
];

export const GOALS = {
  cut: { label: 'Cut', verb: 'Cutting', detail: 'Lose fat', rates: [0.5, 1, 1.5], defaultRate: 1 },
  maintain: { label: 'Maintain', verb: 'Maintaining', detail: 'Stay where you are', rates: [], defaultRate: 0 },
  bulk: { label: 'Bulk', verb: 'Bulking', detail: 'Build muscle', rates: [0.25, 0.5, 0.75], defaultRate: 0.5 },
};

// Recommended split: protein scales with body weight (g per lb), fat is a
// fixed share, carbs fill the rest. Rounded to 5% so the sliders line up.
const PROTEIN_PER_LB = { cut: 1, maintain: 0.8, bulk: 0.9 };
const FAT_PCT = { cut: 25, maintain: 30, bulk: 25 };
const round5 = (n) => Math.round(n / 5) * 5;

export function recommendedPct(profile, calories, weight) {
  if (!profile || !calories || !weight) return { protein: 30, carbs: 40, fat: 30 };
  const protein = Math.min(45, Math.max(20, round5(((weight * PROTEIN_PER_LB[profile.goal] * 4) / calories) * 100)));
  const fat = FAT_PCT[profile.goal];
  return { protein, carbs: 100 - protein - fat, fat };
}

export const MACRO_CHOICES = [
  { id: 'balanced', label: 'Balanced', pct: { protein: 30, carbs: 40, fat: 30 } },
  { id: 'high-protein', label: 'High protein', pct: { protein: 40, carbs: 35, fat: 25 } },
  { id: 'low-carb', label: 'Low carb', pct: { protein: 35, carbs: 25, fat: 40 } },
  { id: 'endurance', label: 'High carb', pct: { protein: 25, carbs: 55, fat: 20 } },
];

const CAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

// Lowest daily target the app will suggest without a doctor or dietitian.
const FLOOR = { male: 1500, female: 1200 };

export function bmr({ sex, age, heightIn, weightLb }) {
  const kg = weightLb * 0.4536;
  const cm = heightIn * 2.54;
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function isComplete(p) {
  return !!p && p.sex && p.age > 0 && p.heightIn > 0 && p.weightLb > 0 && p.goal && p.activity;
}

// Everything derived from a profile, using the latest weigh-in as current weight.
export function plan(profile, latestWeight, today) {
  if (!isComplete(profile)) return null;
  const weight = latestWeight ?? profile.weightLb;
  const factor = ACTIVITY.find((a) => a.id === profile.activity)?.factor ?? 1.375;
  const base = bmr({ ...profile, weightLb: weight });
  const tdee = base * factor;
  const sign = profile.goal === 'cut' ? -1 : profile.goal === 'bulk' ? 1 : 0;
  const rate = sign ? profile.rate : 0;
  const raw = tdee + sign * rate * 500;
  const floor = FLOOR[profile.sex] ?? 1200;
  const calories = Math.round(Math.max(raw, floor) / 10) * 10;

  const result = {
    bmr: Math.round(base),
    tdee: Math.round(tdee / 10) * 10,
    calories,
    limited: raw < floor,
    weight,
    rate,
    weeksLeft: null,
    eta: null,
    reached: false,
    wrongWay: false,
  };

  if (sign && profile.goalWeightLb) {
    const toGo = profile.goalWeightLb - weight;
    if (toGo * sign <= 0) {
      result.reached = true;
    } else if (rate > 0) {
      result.weeksLeft = Math.abs(toGo) / rate;
      result.eta = addDays(today, Math.round(result.weeksLeft * 7));
    }
    // e.g. cutting with a goal weight above the starting weight
    result.wrongWay = (profile.goalWeightLb - profile.startWeightLb) * sign < 0;
  }
  return result;
}

export function macroPct(settings, calories, weight) {
  return settings.macros ?? recommendedPct(settings.profile, calories, weight);
}

export function gramsFor(calories, pct) {
  const g = {};
  for (const k of Object.keys(CAL_PER_GRAM)) g[k] = Math.round((calories * pct[k]) / 100 / CAL_PER_GRAM[k]);
  return g;
}

export function targets(settings, latestWeight, today) {
  const p = plan(settings.profile, latestWeight, today);
  const calories = settings.calorieOverride || p?.calories || 2000;
  const pct = macroPct(settings, calories, p?.weight);
  return { calories, pct, recommendedPct: recommendedPct(settings.profile, calories, p?.weight), ...gramsFor(calories, pct), plan: p };
}

// Checkpoints from the starting weight to the goal. Upcoming ones are
// projected from the latest weigh-in at the planned rate.
export function milestones(profile, latestWeight, today) {
  if (!profile || profile.goal === 'maintain' || !profile.rate) return [];
  const S = profile.startWeightLb;
  const G = profile.goalWeightLb;
  if (!S || !G || S === G) return [];
  const dir = Math.sign(G - S);
  const current = latestWeight ?? S;
  return [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const weight = Math.round((S + (G - S) * f) * 10) / 10;
    const reached = f === 0 || (current - weight) * dir >= 0;
    const weeks = Math.abs(weight - current) / profile.rate;
    return { f, weight, reached, date: reached ? null : addDays(today, Math.round(weeks * 7)) };
  });
}

// Actual lb/week since the goal started, once there are 7+ days of weigh-ins.
export function actualRate(weights, startDate) {
  const since = weights.filter((w) => w.date >= startDate);
  if (since.length < 2) return null;
  const first = since[0];
  const last = since[since.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 7) return null;
  return ((last.lb - first.lb) / days) * 7;
}
