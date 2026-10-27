import { totals } from '../utils.js';

export default function Summary({ entries, settings, onClick }) {
  const t = totals(entries);
  const goal = settings.calorieGoal || 0;
  const left = goal - t.calories;
  const pct = goal ? Math.min(100, (t.calories / goal) * 100) : 0;

  return (
    <button className="summary" onClick={onClick} aria-label="Open today's log">
      <div className="summary-row">
        <div>
          <div className="summary-big">{Math.round(t.calories)}</div>
          <div className="summary-label">calories today</div>
        </div>
        {goal > 0 && (
          <div className="summary-right">
            <div className={`summary-left ${left < 0 ? 'over' : ''}`}>
              {left >= 0 ? `${Math.round(left)} left` : `${Math.round(-left)} over`}
            </div>
            <div className="summary-label">goal {goal}</div>
          </div>
        )}
      </div>
      {goal > 0 && (
        <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`bar-fill ${left < 0 ? 'over' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="macros">
        <span><b>{Math.round(t.protein)}g</b> protein{settings.proteinGoal ? ` / ${settings.proteinGoal}` : ''}</span>
        <span><b>{Math.round(t.carbs)}g</b> carbs</span>
        <span><b>{Math.round(t.fat)}g</b> fat</span>
      </div>
    </button>
  );
}
