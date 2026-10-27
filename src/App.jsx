import { useEffect, useMemo, useRef, useState } from 'react';
import Today from './components/Today.jsx';
import MenuView from './components/MenuView.jsx';
import Progress from './components/Progress.jsx';
import Settings from './components/Settings.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import AddSheet from './components/AddSheet.jsx';
import ScanSheet from './components/ScanSheet.jsx';
import Icon from './components/Icon.jsx';
import { loadLog, saveLog, loadSettings, saveSettings, loadWeights, saveWeights } from './storage.js';
import { targets as computeTargets } from './nutrition.js';
import { dateKey, mealForPeriod, mealForTime, uid } from './utils.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'menu', label: 'Menu', icon: 'menu' },
  null, // center add button
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function App() {
  const [menus, setMenus] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [tab, setTab] = useState('today');
  const [log, setLog] = useState(loadLog);
  const [weights, setWeights] = useState(loadWeights);
  const [settings, setSettings] = useState(loadSettings);
  const [today, setToday] = useState(dateKey);
  const [day, setDay] = useState(dateKey); // the day being viewed and logged to
  const [sheet, setSheet] = useState(null); // { type: 'item', item, hall, period } | { type: 'custom', meal }
  const [mealHint, setMealHint] = useState(null); // { meal, n } jumps the menu to that meal

  useEffect(() => {
    fetch('./menus.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMenus)
      .catch((e) => setMenuError(e.message));
  }, []);

  // Roll over to a new day if the app stays open past midnight.
  useEffect(() => {
    const check = () => setToday(dateKey());
    document.addEventListener('visibilitychange', check);
    const t = setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      clearInterval(t);
    };
  }, []);
  const prevToday = useRef(today);
  useEffect(() => {
    if (day === prevToday.current) setDay(today);
    prevToday.current = today;
  }, [today]);

  useEffect(() => saveLog(log), [log]);
  useEffect(() => saveWeights(weights), [weights]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const latestWeight = weights.length ? weights[weights.length - 1].lb : null;
  const targets = useMemo(() => computeTargets(settings, latestWeight, today), [settings, latestWeight, today]);

  function addEntry(entry) {
    setLog((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), { uid: uid(), at: Date.now(), ...entry }] }));
  }

  function addMenuItem(item, hall, period, servings = 1) {
    addEntry({
      name: item.name,
      hall: hall.name,
      period: period.name,
      meal: period.retail ? mealForTime() : mealForPeriod(period.name),
      serving: item.serving,
      servings,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    });
  }

  function removeEntry(d, entryUid) {
    setLog((prev) => {
      const next = { ...prev, [d]: (prev[d] ?? []).filter((e) => e.uid !== entryUid) };
      if (!next[d].length) delete next[d];
      return next;
    });
  }

  function logWeight(date, lb) {
    setWeights((prev) => [...prev.filter((w) => w.date !== date), { date, lb }].sort((a, b) => (a.date < b.date ? -1 : 1)));
  }

  function openMeal(meal) {
    if (meal === 'Snacks') {
      setSheet({ type: 'custom', meal });
    } else {
      setMealHint({ meal, n: Date.now() });
      setTab('menu');
    }
  }

  function openDay(d) {
    setDay(d);
    setTab('today');
  }

  return (
    <div className="app">
      <main className="content">
        {tab === 'today' && (
          <Today
            log={log}
            day={day}
            today={today}
            onPickDay={setDay}
            targets={targets}
            onRemove={removeEntry}
            onAddMeal={openMeal}
            hasProfile={!!targets.plan}
            onSetup={() => setTab('settings')}
          />
        )}
        {tab === 'menu' && (
          <MenuView
            menus={menus}
            error={menuError}
            day={day}
            today={today}
            mealHint={mealHint}
            onSelect={(item, hall, period) => setSheet({ type: 'item', item, hall, period })}
            onQuickAdd={addMenuItem}
            onScan={() => setSheet({ type: 'scan', meal: mealForTime() })}
          />
        )}
        {tab === 'progress' && (
          <Progress
            log={log}
            today={today}
            weights={weights}
            settings={settings}
            targets={targets}
            onLogWeight={logWeight}
            onOpenDay={openDay}
            onSetup={() => setTab('settings')}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            onChange={setSettings}
            latestWeight={latestWeight}
            today={today}
            targets={targets}
            onLogWeight={logWeight}
            onCleared={() => {
              setLog({});
              setWeights([]);
              setSettings(loadSettings());
            }}
          />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) =>
          t ? (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={22} />
              {t.label}
            </button>
          ) : (
            <div key="fab" className="fab-slot">
              <button className="fab" onClick={() => setSheet({ type: 'custom', meal: mealForTime() })} aria-label="Add food">
                <Icon name="plus" size={26} />
              </button>
            </div>
          ),
        )}
      </nav>

      {sheet?.type === 'item' && (
        <ItemSheet
          {...sheet}
          onClose={() => setSheet(null)}
          onAdd={(servings) => {
            addMenuItem(sheet.item, sheet.hall, sheet.period, servings);
            setSheet(null);
          }}
        />
      )}
      {sheet?.type === 'custom' && (
        <AddSheet
          key={sheet.n}
          meal={sheet.meal}
          initial={sheet.initial}
          onClose={() => setSheet(null)}
          onBrowseMenu={() => {
            setSheet(null);
            setTab('menu');
          }}
          onScan={(meal) => setSheet({ type: 'scan', meal })}
          onAdd={(entry) => {
            addEntry(entry);
            setSheet(null);
          }}
        />
      )}
      {sheet?.type === 'scan' && (
        <ScanSheet
          meal={sheet.meal}
          onClose={() => setSheet(null)}
          onManual={(name) => setSheet({ type: 'custom', meal: sheet.meal, initial: { name }, n: Date.now() })}
          onAdd={(entry) => {
            addEntry(entry);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}
