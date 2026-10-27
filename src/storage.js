// Everything is stored on the phone in localStorage. Reads and writes are
// wrapped because storage can throw (private browsing, storage full).

const LOG_KEY = 'pp.log';
const SETTINGS_KEY = 'pp.settings';
const WEIGHTS_KEY = 'pp.weights';

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  profile: null, // see GoalsForm in Settings.jsx
  macros: null, // { protein, carbs, fat } percents; null = recommended for the goal
  calorieOverride: 0, // 0 = use the calculated target
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not fatal: the app keeps working for this session.
  }
}

// Log shape: { 'YYYY-MM-DD': [entry, ...] }
export const loadLog = () => read(LOG_KEY, {});
export const saveLog = (log) => write(LOG_KEY, log);

// Weigh-ins, sorted by date: [{ date: 'YYYY-MM-DD', lb }]
export const loadWeights = () => read(WEIGHTS_KEY, []);
export const saveWeights = (w) => write(WEIGHTS_KEY, w);

export function loadSettings() {
  const raw = read(SETTINGS_KEY, {});
  // v0.1 stored a plain calorieGoal (default 2000); keep a custom one as an override.
  if (raw.calorieGoal && raw.calorieGoal !== 2000 && !raw.calorieOverride) raw.calorieOverride = raw.calorieGoal;
  delete raw.calorieGoal;
  delete raw.proteinGoal;
  return { ...DEFAULT_SETTINGS, ...raw };
}
export const saveSettings = (s) => write(SETTINGS_KEY, s);

export function clearAll() {
  try {
    for (const k of [LOG_KEY, SETTINGS_KEY, WEIGHTS_KEY]) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
