import { useEffect, useState } from 'react';
import MenuView from './components/MenuView.jsx';
import TodayView from './components/TodayView.jsx';
import SettingsView from './components/SettingsView.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import Summary from './components/Summary.jsx';
import { loadLog, saveLog, loadSettings, saveSettings } from './storage.js';
import { dateKey, uid } from './utils.js';

const TABS = [
  { id: 'menu', label: 'Menu', icon: '🍽' },
  { id: 'today', label: 'Today', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const [menus, setMenus] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [tab, setTab] = useState('menu');
  const [log, setLog] = useState(loadLog);
  const [settings, setSettings] = useState(loadSettings);
  const [selected, setSelected] = useState(null); // { item, hall, period }
  const [today, setToday] = useState(dateKey);

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

  useEffect(() => saveLog(log), [log]);
  useEffect(() => saveSettings(settings), [settings]);

  const todayEntries = log[today] ?? [];

  function addEntry(entry) {
    setLog((prev) => ({ ...prev, [today]: [...(prev[today] ?? []), { uid: uid(), at: Date.now(), ...entry }] }));
  }

  function removeEntry(day, entryUid) {
    setLog((prev) => {
      const next = { ...prev, [day]: (prev[day] ?? []).filter((e) => e.uid !== entryUid) };
      if (!next[day].length) delete next[day];
      return next;
    });
  }

  return (
    <div className="app">
      <header className="top">
        <Summary entries={todayEntries} settings={settings} onClick={() => setTab('today')} />
      </header>

      <main className="content">
        {tab === 'menu' && (
          <MenuView
            menus={menus}
            error={menuError}
            today={today}
            onSelect={(item, hall, period) => setSelected({ item, hall, period })}
          />
        )}
        {tab === 'today' && (
          <TodayView log={log} today={today} settings={settings} onRemove={removeEntry} onQuickAdd={addEntry} />
        )}
        {tab === 'settings' && (
          <SettingsView settings={settings} onChange={setSettings} onCleared={() => setLog({})} />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {selected && (
        <ItemSheet
          {...selected}
          onClose={() => setSelected(null)}
          onAdd={(servings) => {
            const { item, hall, period } = selected;
            addEntry({
              name: item.name,
              hall: hall.name,
              period: period.name,
              serving: item.serving,
              servings,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
