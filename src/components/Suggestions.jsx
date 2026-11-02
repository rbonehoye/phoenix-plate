import { useMemo, useState } from 'react';
import { MAIN_MEALS, mealBudget, nextMeal, suggestMeals } from '../suggest.js';
import { capitalize, fmt, mealForTime } from '../utils.js';

const stationName = (s) => (s === s.toLowerCase() ? capitalize(s) : s);

// Plates from today's menus for a meal (the next one with nothing logged, by
// default), sized to what's left of the day's calories and protein.
export default function Suggestions({ menus, entries, targets, today, onAddPlate }) {
  const [picked, setPicked] = useState(null);
  const [added, setAdded] = useState(null);
  const now = mealForTime();
  const meal = picked ?? nextMeal(entries, now) ?? (now === 'Snacks' ? 'Dinner' : now);
  const budget = mealBudget(targets, entries, meal);
  const fresh = menus?.date === today;
  const plates = useMemo(
    () => (fresh ? suggestMeals(menus, meal, budget) : []),
    [menus, fresh, meal, budget.calories, budget.protein],
  );

  if (!menus) return <p className="notice">Loading menus…</p>;
  if (!fresh) return <p className="notice">Meal ideas use today’s menu, which hasn’t been fetched yet. Check back after 6am.</p>;

  return (
    <>
      <div className="segmented" role="tablist" aria-label="Meal" style={{ marginBottom: 12 }}>
        {MAIN_MEALS.map((m) => (
          <button key={m} role="tab" aria-selected={m === meal} className={m === meal ? 'active' : ''} onClick={() => setPicked(m)}>
            {m}
          </button>
        ))}
      </div>
      <p className="sub" style={{ margin: '-4px 4px 10px' }}>
        Aiming for about {fmt(budget.calories)} cal and {Math.round(budget.protein)}g protein, based on what’s left today.
      </p>

      {added?.meal === meal && (
        <p className="notice good">Added to {meal.toLowerCase()}. The ideas below now fit what’s left.</p>
      )}

      {plates.length === 0 ? (
        <p className="notice">No plates to suggest for {meal.toLowerCase()} today. The halls may not be serving it.</p>
      ) : (
        plates.map((p) => {
          const key = `${meal}-${p.hall.id}-${p.parts[0].item.name}`;
          return (
            <section key={key} className="card plate">
              <div className="plate-head">
                <h3>{p.hall.name}</h3>
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
                disabled={added?.key === key}
                onClick={() => {
                  onAddPlate(p);
                  setAdded({ key, meal });
                }}
              >
                {added?.key === key ? 'Added' : `Add to ${meal.toLowerCase()}`}
              </button>
            </section>
          );
        })
      )}
      <p className="fine">Picked from today’s menu by calories and protein. Swap anything you don’t like.</p>
    </>
  );
}
