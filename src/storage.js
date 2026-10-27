// Everything is stored on the phone in localStorage. Reads and writes are
// wrapped because storage can throw (private browsing, storage full).

const LOG_KEY = 'pp.log';
const SETTINGS_KEY = 'pp.settings';

export const DEFAULT_SETTINGS = { calorieGoal: 2000, proteinGoal: 100 };

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

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) });
export const saveSettings = (s) => write(SETTINGS_KEY, s);

export function clearAll() {
  try {
    localStorage.removeItem(LOG_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignore
  }
}
