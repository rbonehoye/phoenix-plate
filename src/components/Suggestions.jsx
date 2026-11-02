import { useMemo, useState } from 'react';
import { mealBudget, nextMeal, suggestMeals } from '../suggest.js';
import { capitalize, fmt, mealForTime } from '../utils.js';

const stationName = (s) => (s === s.toLowerCase() ? capitalize(s) : s);

// Plates from today's menus for the next meal with nothing logged, sized to
// what's left of the day's calories and protein.
export default function Suggestions({ menus, entries, targets, today, onAddPlate }) {
  const [added, setAdded] = useState(null);
  const meal = nextMeal(entries, mealForTime());
  const budget = meal && mealBudget(targets, entries, meal);
  const plates = useMemo(
    () => (meal && menus?.date === today ? suggestMeals(menus, meal, budget) : []),
    [menus, meal, today, budget?.calories, budget?.protein],
  );
  if (!plates.length) return null;

  return (
    <section className="card suggest">
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Ideas for {meal.toLowerCase()}</h2>
        <span className="sub">About {fmt(budget.calories)} cal · {Math.round(budget.protein)}g protein</span>
      </div>
      {plates.map((p) => {
        const key = `${p.hall.id}-${p.parts[0].item.name}`;
        return (
          <div key={key} className="plate">
            <div className="plate-head">
              <b>{p.hall.name}</b>
              <span className="sub num">{fmt(p.totals.calories)} cal · {Math.round(p.totals.protein)}g protein</span>
            </div>
            <ul>
              {p.parts.map(({ item, servings }) => (
                <li key={item.name}>
                  <span>{servings > 1 && <b>{servings}× </b>}{item.name}</span>
                  <span className="sub">{stationName(item.station)}</span>
                </li>
              ))}
            </ul>
            <button
              className="btn block"
              disabled={added === key}
              onClick={() => {
                onAddPlate(p);
                setAdded(key);
              }}
            >
              {added === key ? 'Added' : `Add to ${meal.toLowerCase()}`}
            </button>
          </div>
        );
      })}
      <p className="fine" style={{ margin: '8px 2px 0' }}>Picked from today’s menu by calories and protein. Swap anything you don’t like.</p>
    </section>
  );
}
