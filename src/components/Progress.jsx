import { useState } from 'react';
import Icon from './Icon.jsx';
import { GOALS, actualRate, milestones } from '../nutrition.js';
import { addDays, daysBetween, fmt, formatDate, streak, totals } from '../utils.js';

const short = (d) => formatDate(d, { month: 'short', day: 'numeric' });
const lbs = (n) => `${Math.round(n * 10) / 10}`;

function WeightChart({ weights, goalWeight, projection }) {
  const W = 320, H = 160, L = 30, R = 8, T = 10, B = 20;
  if (!weights.length) return null;
  const last = weights[weights.length - 1];
  const x0 = weights[0].date;
  const xEnd = projection?.date ?? last.date;
  const span = Math.max(7, daysBetween(x0, xEnd));
  const ys = [...weights.map((w) => w.lb), goalWeight].filter((v) => v != null);
  const lo = Math.floor(Math.min(...ys) - 2);
  const hi = Math.ceil(Math.max(...ys) + 2);
  const x = (d) => L + (daysBetween(x0, d) / span) * (W - L - R);
  const y = (lb) => T + ((hi - lb) / (hi - lo)) * (H - T - B);
  const ticks = [hi, Math.round((hi + lo) / 2), lo];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight over time">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 5} y={y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {goalWeight != null && (
        <>
          <line x1={L} x2={W - R} y1={y(goalWeight)} y2={y(goalWeight)} stroke="var(--gold)" strokeDasharray="4 3" />
          <text x={L + 4} y={y(goalWeight) - 4} style={{ fill: 'var(--gold-ink)' }}>Goal {lbs(goalWeight)}</text>
        </>
      )}
      {projection && (
        <line x1={x(last.date)} y1={y(last.lb)} x2={x(projection.date)} y2={y(projection.lb)} stroke="var(--gold)" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
      )}
      <polyline points={weights.map((w) => `${x(w.date)},${y(w.lb)}`).join(' ')} fill="none" stroke="var(--maroon)" strokeWidth="2.5" strokeLinejoin="round" />
      {weights.map((w) => (
        <circle key={w.date} cx={x(w.date)} cy={y(w.lb)} r="3.5" fill="var(--card)" stroke="var(--maroon)" strokeWidth="2" />
      ))}
      <text x={L} y={H - 4}>{short(x0)}</text>
      <text x={W - R} y={H - 4} textAnchor="end">{short(xEnd)}</text>
    </svg>
  );
}

function LogWeight({ latest, today, onLog }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  function submit(e) {
    e.preventDefault();
    const lb = Number(v);
    if (!(lb >= 70 && lb <= 500)) {
      setErr('Enter a weight between 70 and 500 lb.');
      return;
    }
    onLog(today, Math.round(lb * 10) / 10);
    setV('');
  }
  return (
    <form onSubmit={submit}>
      <div className="log-weight">
        <input
          className="input"
          inputMode="decimal"
          placeholder={latest ? `Today’s weight (last ${lbs(latest)} lb)` : 'Today’s weight (lb)'}
          value={v}
          onChange={(e) => {
            setErr('');
            setV(e.target.value.replace(/[^\d.]/g, ''));
          }}
        />
        <button className="btn primary">Log</button>
      </div>
      {err && <p className="errors" style={{ paddingLeft: 0, marginTop: 6 }}>{err}</p>}
    </form>
  );
}

function GoalCard({ profile, plan, weights, today, onLogWeight }) {
  const goal = GOALS[profile.goal];
  const latest = weights.length ? weights[weights.length - 1].lb : profile.weightLb;
  const cutOrBulk = profile.goal !== 'maintain';
  const steps = milestones(profile, latest, today);
  const nextIdx = steps.findIndex((s) => !s.reached);
  const actual = actualRate(weights, profile.startDate);
  const projection = cutOrBulk && plan.eta && !plan.reached ? { date: plan.eta, lb: profile.goalWeightLb } : null;
  const recent = weights.filter((w) => w.date >= addDays(today, -30));
  const change30 = recent.length > 1 ? recent[recent.length - 1].lb - recent[0].lb : null;

  return (
    <section className="card">
      <div className="card-head">
        <h2 style={{ margin: 0 }}>{goal.verb}{cutOrBulk ? ` · ${profile.rate} lb/week` : ''}</h2>
        <span className="sub">{fmt(plan.calories)} cal/day</span>
      </div>

      <div className="weight-row">
        <div><b>{lbs(latest)}</b><span>Current</span></div>
        <div><b>{cutOrBulk ? lbs(profile.goalWeightLb) : lbs(profile.startWeightLb)}</b><span>{cutOrBulk ? 'Goal' : 'Start'}</span></div>
        <div>
          <b>{cutOrBulk ? lbs(Math.abs(profile.goalWeightLb - latest)) : change30 == null ? '–' : `${change30 > 0 ? '+' : ''}${lbs(change30)}`}</b>
          <span>{cutOrBulk ? 'lb to go' : 'lb, 30 days'}</span>
        </div>
      </div>

      <WeightChart weights={weights} goalWeight={cutOrBulk ? profile.goalWeightLb : null} projection={projection} />
      <LogWeight latest={weights.length ? latest : null} today={today} onLog={onLogWeight} />

      {cutOrBulk && (
        <>
          <h3 style={{ margin: '18px 0 4px' }}>Timeline</h3>
          {plan.wrongWay ? (
            <p className="notice warn">Your goal weight is {profile.goal === 'cut' ? 'above' : 'below'} your starting weight. Update your goal in Settings.</p>
          ) : plan.reached ? (
            <p className="sub" style={{ marginBottom: 10 }}>You’ve reached your goal weight. You can switch to maintain in Settings.</p>
          ) : (
            <p className="sub" style={{ marginBottom: 10 }}>
              At {profile.rate} lb/week you’ll reach {lbs(profile.goalWeightLb)} lb around{' '}
              <b style={{ color: 'var(--text)' }}>{formatDate(plan.eta, { month: 'long', day: 'numeric', year: 'numeric' })}</b> ({Math.ceil(plan.weeksLeft)} weeks).
              {actual != null && (
                <> You’re {actual < 0 ? 'losing' : 'gaining'} {lbs(Math.abs(actual))} lb/week so far.</>
              )}
            </p>
          )}
          {!plan.wrongWay && (
            <ol className="timeline">
              {steps.map((s, i) => (
                <li key={s.f} className={s.reached ? 'reached' : i === nextIdx ? 'next' : ''}>
                  <span className="tl-dot">{s.reached && <Icon name="check" size={14} />}</span>
                  <div className="tl-main">
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.f === 0 ? 'Start' : s.f === 1 ? 'Goal' : s.f === 0.5 ? 'Halfway' : `${s.f * 100}%`}</div>
                      <div className="sub">{s.f === 0 ? short(profile.startDate) : s.reached ? 'Reached' : `Planned for ${short(s.date)}`}</div>
                    </div>
                    <b className="num">{lbs(s.weight)} lb</b>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function WeekCalories({ log, today, goal, onOpenDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const cals = days.map((d) => totals(log[d]).calories);
  const max = Math.max(goal * 1.25, ...cals);
  const W = 320, H = 130, B = 18, T = 6;
  const bw = 28;
  const gap = (W - bw * 7) / 7;
  const y = (v) => T + (1 - v / max) * (H - T - B);

  return (
    <section className="card">
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Calories</h2>
        <span className="sub">Goal {fmt(goal)} · tap a day</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calories for the last 7 days">
        <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--gold)" strokeDasharray="4 3" />
        {days.map((d, i) => {
          const bx = gap / 2 + i * (bw + gap);
          const v = cals[i];
          const top = v ? y(v) : H - B - 3;
          return (
            <g key={d} onClick={() => onOpenDay(d)} style={{ cursor: 'pointer' }}>
              <rect x={bx - gap / 2} y="0" width={bw + gap} height={H} fill="transparent" />
              <rect x={bx} y={top} width={bw} height={H - B - top} rx="6" fill={d === today ? 'var(--maroon)' : v > goal * 1.05 ? 'var(--over)' : 'var(--track)'} />
              <text x={bx + bw / 2} y={H - 4} textAnchor="middle" style={d === today ? { fill: 'var(--maroon)', fontWeight: 700 } : undefined}>
                {formatDate(d, { weekday: 'narrow' })}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function Stats({ log, today, targets }) {
  // Last 7 complete days (today is still in progress)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, -1 - i)).filter((d) => log[d]?.length);
  const avg = (k) => (week.length ? week.reduce((s, d) => s + totals(log[d])[k], 0) / week.length : null);
  const avgCal = avg('calories');
  const avgProtein = avg('protein');
  const diff = avgCal == null ? null : avgCal - targets.calories;

  const hallCounts = {};
  for (let i = 0; i < 30; i++) {
    for (const e of log[addDays(today, -i)] ?? []) if (e.hall) hallCounts[e.hall] = (hallCounts[e.hall] ?? 0) + 1;
  }
  const [topHall, topCount] = Object.entries(hallCounts).sort((a, b) => b[1] - a[1])[0] ?? [];
  const allHall = Object.values(hallCounts).reduce((a, b) => a + b, 0);
  const s = streak(log, today);

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-label">Daily average</div>
        <div className="stat-val">{avgCal == null ? '–' : fmt(avgCal)}</div>
        <div className="stat-sub">{diff == null ? 'Past 7 days' : <span className={Math.abs(diff) <= 100 ? 'good' : diff > 0 ? 'over' : ''}>{fmt(Math.abs(diff))} {diff > 0 ? 'over' : 'under'} goal</span>}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Logging streak</div>
        <div className="stat-val">{s} {s === 1 ? 'day' : 'days'}</div>
        <div className="stat-sub">Keep it going</div>
      </div>
      <div className="stat">
        <div className="stat-label">Average protein</div>
        <div className="stat-val">{avgProtein == null ? '–' : `${Math.round(avgProtein)}g`}</div>
        <div className="stat-sub">Goal {targets.protein}g</div>
      </div>
      <div className="stat">
        <div className="stat-label">Top dining hall</div>
        <div className="stat-val">{topHall ?? '–'}</div>
        <div className="stat-sub">{topHall ? `${topCount} of ${allHall} items, 30 days` : 'Last 30 days'}</div>
      </div>
    </div>
  );
}

export default function Progress({ log, today, weights, settings, targets, onLogWeight, onOpenDay, onSetup }) {
  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">Your trends</div>
          <h1>Progress</h1>
        </div>
      </header>

      {targets.plan ? (
        <GoalCard profile={settings.profile} plan={targets.plan} weights={weights} today={today} onLogWeight={onLogWeight} />
      ) : (
        <button className="card setup" onClick={onSetup}>
          <span className="setup-icon"><Icon name="target" /></span>
          <span className="grow">
            <h3>Set your goal</h3>
            <span className="sub">Add your weight, height and goal to see a timeline to your goal weight.</span>
          </span>
          <Icon name="right" size={18} />
        </button>
      )}

      <WeekCalories log={log} today={today} goal={targets.calories} onOpenDay={onOpenDay} />
      <Stats log={log} today={today} targets={targets} />
    </div>
  );
}
