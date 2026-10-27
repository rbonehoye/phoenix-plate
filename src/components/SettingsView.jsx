import { clearAll } from '../storage.js';

export default function SettingsView({ settings, onChange, onCleared }) {
  const set = (key) => (e) => onChange({ ...settings, [key]: Number(e.target.value.replace(/\D/g, '')) || 0 });

  return (
    <div>
      <h2 className="page-title">Settings</h2>

      <label className="field">
        <span>Daily calorie goal</span>
        <input inputMode="numeric" value={settings.calorieGoal || ''} placeholder="0 = no goal" onChange={set('calorieGoal')} />
      </label>
      <label className="field">
        <span>Daily protein goal (g)</span>
        <input inputMode="numeric" value={settings.proteinGoal || ''} placeholder="0 = no goal" onChange={set('proteinGoal')} />
      </label>

      <h3>Install on your phone</h3>
      <p className="muted">
        iPhone: open this page in Safari, tap Share, then <b>Add to Home Screen</b>.<br />
        Android: open the Chrome menu and tap <b>Add to Home screen</b>.
      </p>

      <h3>Your data</h3>
      <p className="muted">Your log stays on this phone. Nothing is sent anywhere.</p>
      <button
        className="btn danger"
        onClick={() => {
          if (confirm('Delete your whole food log and settings from this phone?')) {
            clearAll();
            onCleared();
          }
        }}
      >
        Clear all data
      </button>

      <p className="fine">
        Nutrition info comes from Elon Dining’s published menus. This app isn’t affiliated with Elon University or its
        dining provider. Values are estimates; check with dining staff about allergies.
      </p>
    </div>
  );
}
