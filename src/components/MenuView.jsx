import { useEffect, useMemo, useRef, useState } from 'react';
import { capitalize, currentPeriodIndex, formatDate } from '../utils.js';

const FILTERS = ['Vegetarian', 'Vegan', 'Made without Gluten'];
const HALL_KEY = 'pp.hall';

function savedHall() {
  try {
    return localStorage.getItem(HALL_KEY);
  } catch {
    return null;
  }
}

export default function MenuView({ menus, error, today, onSelect }) {
  const [hallId, setHallId] = useState(savedHall);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  const hall = menus?.halls.find((h) => h.id === hallId) ?? menus?.halls[0];
  const periods = hall?.periods ?? [];
  const period = periods[periodIdx];

  // Jump to the meal happening now whenever the hall changes.
  useEffect(() => {
    if (hall) setPeriodIdx(currentPeriodIndex(hall.periods));
  }, [hall?.id]);

  // Keep the selected meal chip visible in the horizontally scrolling row.
  const chipsRef = useRef(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.children[periodIdx];
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - row.offsetLeft - 16, behavior: 'smooth' });
  }, [periodIdx, hall?.id]);

  function pickHall(id) {
    setHallId(id);
    try {
      localStorage.setItem(HALL_KEY, id);
    } catch {
      // ignore
    }
  }

  const stations = useMemo(() => {
    if (!period) return [];
    const q = query.trim().toLowerCase();
    return period.stations
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) =>
            (!q || it.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) &&
            filters.every((f) => it.tags.includes(f)),
        ),
      }))
      .filter((s) => s.items.length);
  }, [period, query, filters]);

  if (error) return <p className="notice">Couldn’t load menus ({error}). Check your connection and reopen the app.</p>;
  if (!menus) return <p className="notice">Loading menus…</p>;

  const searching = query.trim() !== '' || filters.length > 0;

  return (
    <div>
      {menus.date !== today && (
        <p className="notice warn">
          Showing the menu from {formatDate(menus.date)}. Today’s menu hasn’t been fetched yet.
        </p>
      )}

      <div className="segmented" role="tablist" aria-label="Dining hall">
        {menus.halls.map((h) => (
          <button key={h.id} role="tab" aria-selected={h.id === hall.id} className={h.id === hall.id ? 'active' : ''} onClick={() => pickHall(h.id)}>
            {h.name}
          </button>
        ))}
      </div>

      {periods.length === 0 ? (
        <p className="notice">No menu posted for {hall.name} today{hall.error ? ` (couldn’t reach the site: ${hall.error})` : ''}.</p>
      ) : (
        <>
          <div className="chips scroll" role="tablist" aria-label="Meal" ref={chipsRef}>
            {periods.map((p, i) => (
              <button key={p.label} className={`chip ${i === periodIdx ? 'active' : ''}`} onClick={() => setPeriodIdx(i)}>
                {p.label}
              </button>
            ))}
          </div>

          <input
            className="search"
            type="search"
            placeholder={`Search ${period?.name.toLowerCase() ?? 'menu'}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`chip small ${filters.includes(f) ? 'active' : ''}`}
                onClick={() => setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))}
              >
                {f}
              </button>
            ))}
          </div>

          {stations.length === 0 && <p className="notice">Nothing matches.</p>}

          {stations.map((s) => {
            const isCollapsed = !searching && collapsed[s.name];
            return (
              <section key={s.name} className="station">
                <button className="station-head" onClick={() => setCollapsed((c) => ({ ...c, [s.name]: !c[s.name] }))} aria-expanded={!isCollapsed}>
                  <span>{capitalize(s.name)}</span>
                  <span className="muted">{s.items.length} {isCollapsed ? '▸' : '▾'}</span>
                </button>
                {!isCollapsed && (
                  <ul className="items">
                    {s.items.map((it, i) => (
                      <li key={`${it.id}-${i}`}>
                        <button className="item" onClick={() => onSelect(it, hall, period)}>
                          <span className="item-main">
                            <span className="item-name">{it.name}</span>
                            <span className="item-sub">
                              {it.serving}
                              {it.protein != null && ` · ${Math.round(it.protein)}g protein`}
                            </span>
                          </span>
                          <span className="item-cal">{it.calories ?? '—'}<small> cal</small></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <p className="fine">
            Menu from <a href={hall.url} target="_blank" rel="noreferrer">elondining.com</a>, updated{' '}
            {new Date(menus.fetchedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            Items and nutrition can change; check with dining staff about allergies.
          </p>
        </>
      )}
    </div>
  );
}
