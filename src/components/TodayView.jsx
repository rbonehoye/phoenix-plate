import { useState } from 'react';
import { formatDate, totals } from '../utils.js';

function QuickAdd({ onAdd }) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');

  function submit(e) {
    e.preventDefault();
    const cal = Number(calories);
    if (!cal) return;
    onAdd({
      name: name.trim() || 'Quick add',
      hall: null,
      period: 'Other',
      serving: null,
      servings: 1,
      calories: cal,
      protein: Number(protein) || 0,
      carbs: null,
      fat: null,
    });
    setName('');
    setCalories('');
    setProtein('');
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <h3>Quick add</h3>
      <p className="muted">For food from outside the dining halls.</p>
      <input placeholder="What did you eat?" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="quick-row">
        <input inputMode="numeric" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value.replace(/\D/g, ''))} />
        <input inputMode="numeric" placeholder="Protein (g)" value={protein} onChange={(e) => setProtein(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" disabled={!Number(calories)}>Add</button>
      </div>
    </form>
  );
}

export default function TodayView({ log, today, settings, onRemove, onQuickAdd }) {
  const entries = log[today] ?? [];
  const history = Object.keys(log)
    .filter((d) => d !== today)
    .sort()
    .reverse()
    .slice(0, 14);

  return (
    <div>
      <h2 className="page-title">Today · {formatDate(today)}</h2>

      {entries.length === 0 ? (
        <p className="notice">Nothing logged yet. Tap a menu item to add it.</p>
      ) : (
        <ul className="log">
          {entries.map((e) => (
            <li key={e.uid}>
              <div className="item-main">
                <span className="item-name">{e.name}</span>
                <span className="item-sub">
                  {[e.hall, e.period, e.servings !== 1 && `${e.servings}×`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <span className="item-cal">{Math.round((e.calories ?? 0) * e.servings)}<small> cal</small></span>
              <button className="remove" onClick={() => onRemove(today, e.uid)} aria-label={`Remove ${e.name}`}>×</button>
            </li>
          ))}
        </ul>
      )}

      <QuickAdd onAdd={onQuickAdd} />

      {history.length > 0 && (
        <>
          <h3>Past days</h3>
          <ul className="history">
            {history.map((d) => {
              const t = totals(log[d]);
              const over = settings.calorieGoal && t.calories > settings.calorieGoal;
              return (
                <li key={d}>
                  <span>{formatDate(d)}</span>
                  <span className="muted">{Math.round(t.protein)}g protein</span>
                  <span className={over ? 'over' : ''}>{Math.round(t.calories)} cal</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
