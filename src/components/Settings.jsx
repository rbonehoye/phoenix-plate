import { useMemo, useState } from 'react';
import { ACTIVITY, GOALS, MACRO_CHOICES, gramsFor, plan } from '../nutrition.js';
import { clearAll } from '../storage.js';
import { fmt } from '../utils.js';

const KEYS = ['protein', 'carbs', 'fat'];
const LABEL = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
const digits = (v) => v.replace(/[^\d.]/g, '');

function draftFrom(profile, latestWeight) {
  if (!profile) {
    return { goal: 'cut', rate: GOALS.cut.defaultRate, sex: '', age: '', ft: '', inch: '', weight: '', goalWeight: '', activity: 'light' };
  }
  return {
    goal: profile.goal,
    rate: profile.rate,
    sex: profile.sex,
    age: String(profile.age),
    ft: String(Math.floor(profile.heightIn / 12)),
    inch: String(profile.heightIn % 12),
    weight: String(latestWeight ?? profile.weightLb),
    goalWeight: profile.goal === 'maintain' ? '' : String(profile.goalWeightLb),
    activity: profile.activity,
  };
}

function validate(d) {
  const errs = [];
  if (!d.sex) errs.push('Choose male or female for the calorie formula.');
  if (!(Number(d.age) >= 13 && Number(d.age) <= 100)) errs.push('Enter an age between 13 and 100.');
  if (!(Number(d.ft) >= 4 && Number(d.ft) <= 7) || !(Number(d.inch || 0) >= 0 && Number(d.inch || 0) < 12)) errs.push('Enter your height in feet and inches.');
  if (!(Number(d.weight) >= 70 && Number(d.weight) <= 500)) errs.push('Enter a current weight between 70 and 500 lb.');
  if (d.goal !== 'maintain') {
    const g = Number(d.goalWeight);
    if (!(g >= 70 && g <= 500)) errs.push('Enter a goal weight between 70 and 500 lb.');
    else if (d.goal === 'cut' && g >= Number(d.weight)) errs.push('For a cut, your goal weight should be below your current weight.');
    else if (d.goal === 'bulk' && g <= Number(d.weight)) errs.push('For a bulk, your goal weight should be above your current weight.');
  }
  return errs;
}

function GoalsForm({ profile, latestWeight, today, onSave }) {
  const [d, setD] = useState(() => draftFrom(profile, latestWeight));
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => {
    setSaved(false);
    setErrors([]);
    setD((prev) => ({ ...prev, [k]: v }));
  };

  function toProfile() {
    const weight = Number(d.weight);
    const goalWeightLb = d.goal === 'maintain' ? weight : Number(d.goalWeight);
    // Restart the timeline when the goal itself changes; keep it when only stats are updated.
    const restart = !profile || profile.goal !== d.goal || profile.goalWeightLb !== goalWeightLb || profile.rate !== d.rate;
    return {
      goal: d.goal,
      rate: d.goal === 'maintain' ? 0 : d.rate,
      sex: d.sex,
      age: Number(d.age),
      heightIn: Number(d.ft) * 12 + Number(d.inch || 0),
      weightLb: weight,
      goalWeightLb,
      activity: d.activity,
      startWeightLb: restart ? weight : profile.startWeightLb,
      startDate: restart ? today : profile.startDate,
    };
  }

  const preview = useMemo(() => (validate(d).length ? null : plan(toProfile(), Number(d.weight), today)), [d, profile, today]);

  function save() {
    const errs = validate(d);
    setErrors(errs);
    if (errs.length) return;
    onSave(toProfile(), Number(d.weight));
    setSaved(true);
  }

  const goal = GOALS[d.goal];

  return (
    <section className="card">
      <h2>Your goal</h2>
      <div className="segmented" style={{ marginBottom: 12 }}>
        {Object.entries(GOALS).map(([id, g]) => (
          <button
            key={id}
            className={d.goal === id ? 'active' : ''}
            onClick={() => {
              set('goal', id);
              set('rate', g.defaultRate);
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {goal.rates.length > 0 && (
        <div className="field">
          <span>{d.goal === 'cut' ? 'Lose' : 'Gain'} per week</span>
          <div className="chips">
            {goal.rates.map((r) => (
              <button key={r} className={`chip ${d.rate === r ? 'active' : ''}`} onClick={() => set('rate', r)}>
                {r} lb
              </button>
            ))}
          </div>
          <div className="hint">
            {d.goal === 'cut' ? '1 lb/week is a steady pace for most people.' : 'A slow bulk (0.25–0.5 lb/week) keeps fat gain down.'}
          </div>
        </div>
      )}

      <div className="row-2">
        <label className="field">
          <span>Current weight (lb)</span>
          <input inputMode="decimal" placeholder="180" value={d.weight} onChange={(e) => set('weight', digits(e.target.value))} />
        </label>
        {d.goal !== 'maintain' && (
          <label className="field">
            <span>Goal weight (lb)</span>
            <input inputMode="decimal" placeholder={d.goal === 'cut' ? '170' : '190'} value={d.goalWeight} onChange={(e) => set('goalWeight', digits(e.target.value))} />
          </label>
        )}
      </div>

      <div className="row-3">
        <label className="field">
          <span>Height (ft)</span>
          <input inputMode="numeric" placeholder="5" value={d.ft} onChange={(e) => set('ft', digits(e.target.value))} />
        </label>
        <label className="field">
          <span>(in)</span>
          <input inputMode="numeric" placeholder="10" value={d.inch} onChange={(e) => set('inch', digits(e.target.value))} />
        </label>
        <label className="field">
          <span>Age</span>
          <input inputMode="numeric" placeholder="20" value={d.age} onChange={(e) => set('age', digits(e.target.value))} />
        </label>
      </div>

      <div className="field">
        <span>Sex (used by the calorie formula)</span>
        <div className="segmented">
          {['male', 'female'].map((s) => (
            <button key={s} className={d.sex === s ? 'active' : ''} onClick={() => set('sex', s)}>
              {s === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Activity level</span>
        <select value={d.activity} onChange={(e) => set('activity', e.target.value)}>
          {ACTIVITY.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}: {a.detail}
            </option>
          ))}
        </select>
      </label>

      {preview && (
        <div className="result">
          <div className="sub">Daily target</div>
          <div className="result-big">{fmt(preview.calories)} cal</div>
          <div className="sub">
            Maintenance is about {fmt(preview.tdee)} cal.
            {d.goal !== 'maintain' && !preview.limited && ` That’s ${fmt(Math.abs(preview.calories - preview.tdee))} ${d.goal === 'cut' ? 'under' : 'over'} to ${d.goal === 'cut' ? 'lose' : 'gain'} ${d.rate} lb/week.`}
            {preview.limited && ' Raised to a safe minimum, so expect slower progress than the pace you picked.'}
            {preview.eta && ` Goal date: about ${Math.ceil(preview.weeksLeft)} weeks.`}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <button className="btn primary block" onClick={save}>
        {saved ? 'Saved' : profile ? 'Update goal' : 'Save goal'}
      </button>
      <p className="fine" style={{ margin: '10px 2px 0' }}>
        Estimates from the Mifflin-St Jeor formula, not medical advice. Talk to a doctor or Elon’s dietitian before a big change.
      </p>
    </section>
  );
}

function MacroEditor({ targets, onChange }) {
  const { pct, calories, recommendedPct: recommended } = targets;
  const g = gramsFor(calories, pct);

  // Move one slider; the other two share the rest in their current proportion.
  function setOne(key, value) {
    const v = Math.min(80, Math.max(5, value));
    const [a, b] = KEYS.filter((k) => k !== key);
    const rest = 100 - v;
    const pool = pct[a] + pct[b] || 1;
    let va = Math.round((rest * pct[a]) / pool / 5) * 5;
    va = Math.min(rest - 5, Math.max(5, va));
    onChange({ ...pct, [key]: v, [a]: va, [b]: rest - va });
  }

  const same = (x, y) => KEYS.every((k) => x[k] === y[k]);

  return (
    <section className="card">
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Macros</h2>
        {!same(pct, recommended) && (
          <button className="pill" style={{ background: 'var(--card-2)' }} onClick={() => onChange(null)}>
            Use recommended
          </button>
        )}
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {MACRO_CHOICES.map((c) => (
          <button key={c.id} className={`chip small ${same(pct, c.pct) ? 'active' : ''}`} onClick={() => onChange(c.pct)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="split-bar">
        {KEYS.map((k) => <div key={k} className={`c-${k}`} style={{ width: `${pct[k]}%` }} />)}
      </div>
      {KEYS.map((k) => (
        <div key={k} className={`slider ${k}`}>
          <div className="slider-top">
            <span><span className={`dot c-${k}`} />{LABEL[k]}</span>
            <span className="num"><b>{g[k]}g</b> <span className="muted">· {pct[k]}%</span></span>
          </div>
          <input type="range" min="5" max="80" step="5" value={pct[k]} onChange={(e) => setOne(k, Number(e.target.value))} aria-label={`${LABEL[k]} percent`} />
        </div>
      ))}
      <p className="sub" style={{ margin: 0 }}>Grams are based on {fmt(calories)} cal a day.</p>
    </section>
  );
}

export default function Settings({ settings, onChange, latestWeight, today, targets, onLogWeight, onCleared }) {
  const update = (patch) => onChange({ ...settings, ...patch });

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">Goals, macros and app</div>
          <h1>Settings</h1>
        </div>
      </header>

      <GoalsForm
        profile={settings.profile}
        latestWeight={latestWeight}
        today={today}
        onSave={(profile, weight) => {
          update({ profile });
          if (weight !== latestWeight) onLogWeight(today, weight);
        }}
      />

      <MacroEditor targets={targets} onChange={(macros) => update({ macros })} />

      <section className="card">
        <h2>Calorie target</h2>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Use my own number instead</span>
          <input
            inputMode="numeric"
            placeholder={targets.plan ? `Calculated: ${fmt(targets.plan.calories)}` : '2000'}
            value={settings.calorieOverride || ''}
            onChange={(e) => update({ calorieOverride: Number(digits(e.target.value)) || 0 })}
          />
          <div className="hint">Leave blank to use the target from your goal.</div>
        </label>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <div className="segmented">
          {[['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map(([id, label]) => (
            <button key={id} className={settings.theme === id ? 'active' : ''} onClick={() => update({ theme: id })}>
              {label}
            </button>
          ))}
        </div>
        <p className="sub" style={{ margin: '8px 2px 0' }}>Automatic follows your phone’s light or dark mode.</p>
      </section>

      <section className="card">
        <h2>Install on your phone</h2>
        <p className="sub" style={{ margin: 0 }}>
          iPhone: open this page in Safari, tap Share, then <b>Add to Home Screen</b>.<br />
          Android: open the Chrome menu and tap <b>Add to Home screen</b>.
        </p>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="sub" style={{ marginTop: 0 }}>Your log, weigh-ins and goals stay on this phone. Nothing is sent anywhere.</p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Delete your food log, weigh-ins and goals from this phone?')) {
              clearAll();
              onCleared();
            }
          }}
        >
          Clear all data
        </button>
      </section>

      <p className="fine">
        Nutrition info comes from Elon Dining’s published menus. This app isn’t affiliated with Elon University or its dining provider.
      </p>
    </div>
  );
}
