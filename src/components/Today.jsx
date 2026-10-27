import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Ring from './Ring.jsx';
import { MEALS, addDays, entryMeal, fmt, formatDate, grams, keyToDate, totals } from '../utils.js';

const MEAL_ICON = { Breakfast: 'coffee', Lunch: 'sun', Dinner: 'moon', Snacks: 'apple' };
const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

// Seven days ending at `end` (today by default); arrows page a week at a time.
function WeekStrip({ day, today, log, onPick }) {
  const [end, setEnd] = useState(today);
  useEffect(() => {
    if (day > end || day < addDays(end, -6)) setEnd(addDays(day, 3) > today ? today : addDays(day, 3));
  }, [day]);
  useEffect(() => setEnd(today), [today]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  const atCurrentWeek = end >= today;

  return (
    <div className="week">
      <button className="icon-btn" onClick={() => setEnd(addDays(end, -7))} aria-label="Previous week">
        <Icon name="left" size={18} />
      </button>
      <div className="week-days">
        {days.map((d) => {
          const cls = ['day', d === day && 'selected', log[d]?.length && 'logged', d === today && 'today'].filter(Boolean).join(' ');
          return (
            <button key={d} className={cls} disabled={d > today} onClick={() => onPick(d)} aria-label={formatDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}>
              <span className="day-dot">{formatDate(d, { weekday: 'narrow' })}</span>
              <span className="day-num">{keyToDate(d).getDate()}</span>
            </button>
          );
        })}
      </div>
      <button className="icon-btn" onClick={() => setEnd(addDays(end, 7) > today ? today : addDays(end, 7))} disabled={atCurrentWeek} aria-label="Next week">
        <Icon name="right" size={18} />
      </button>
    </div>
  );
}

export default function Today({ log, day, today, onPickDay, targets, onRemove, onAddMeal, hasProfile, onSetup }) {
  const entries = log[day] ?? [];
  const t = totals(entries);
  const left = targets.calories - t.calories;
  const title = day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : formatDate(day, { weekday: 'long' });

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">{formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          <h1>{title}</h1>
        </div>
        {day !== today && (
          <button className="pill" onClick={() => onPickDay(today)}>
            Back to today
          </button>
        )}
      </header>

      <WeekStrip day={day} today={today} log={log} onPick={onPickDay} />

      <section className="card cal-card">
        <div className="cal-side">
          <b>{fmt(t.calories)}</b>
          <span>Eaten</span>
        </div>
        <Ring size={132} stroke={12} value={t.calories} max={targets.calories} color={left < 0 ? 'var(--over)' : 'var(--maroon)'}>
          <b className="ring-big">{fmt(Math.abs(left))}</b>
          <span>{left < 0 ? 'cal over' : 'cal left'}</span>
        </Ring>
        <div className="cal-side">
          <b>{fmt(targets.calories)}</b>
          <span>Goal</span>
        </div>
      </section>

      <div className="macro-grid">
        {MACROS.map(({ key, label }) => (
          <div key={key} className="macro">
            <div className="macro-label">{label}</div>
            <div className="macro-val">
              {Math.round(t[key])}
              <small>/{targets[key]}g</small>
            </div>
            <div className="bar">
              <div className={`c-${key}`} style={{ width: `${Math.min(100, (t[key] / (targets[key] || 1)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {!hasProfile && (
        <button className="card setup" onClick={onSetup}>
          <span className="setup-icon">
            <Icon name="target" />
          </span>
          <span className="grow">
            <h3>Set your goal</h3>
            <span className="sub">Get calorie and macro targets for cutting, bulking or maintaining.</span>
          </span>
          <Icon name="right" size={18} />
        </button>
      )}

      <section className="card meals">
        {MEALS.map((meal) => {
          const list = entries.filter((e) => entryMeal(e) === meal);
          const cal = totals(list).calories;
          const halls = [...new Set(list.map((e) => e.hall).filter(Boolean))];
          return (
            <div key={meal} className="meal">
              <div className="meal-head">
                <span className={`meal-icon ${meal.toLowerCase()}`}>
                  <Icon name={MEAL_ICON[meal]} size={18} />
                </span>
                <div className="grow">
                  <div className="meal-name">{meal}</div>
                  <div className="sub">{list.length ? `${halls.join(', ') || 'Custom'} · ${fmt(cal)} cal` : 'Nothing yet'}</div>
                </div>
                <button className="add-btn" onClick={() => onAddMeal(meal)} aria-label={`Add to ${meal.toLowerCase()}`}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {list.length > 0 && (
                <ul className="meal-items">
                  {list.map((e) => (
                    <li key={e.uid}>
                      <div className="grow">
                        <span className="name">{e.name}</span>
                        <span className="kpcf">
                          {e.servings !== 1 && `${e.servings}× · `}P {grams(e.protein, e.servings)} · C {grams(e.carbs, e.servings)} · F {grams(e.fat, e.servings)}
                        </span>
                      </div>
                      <span className="cal">{fmt((e.calories ?? 0) * e.servings)}</span>
                      <button className="x" onClick={() => onRemove(day, e.uid)} aria-label={`Remove ${e.name}`}>
                        <Icon name="x" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
