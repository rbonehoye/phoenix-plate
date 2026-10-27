import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { RETAIL } from '../retail.js';
import { capitalize, currentPeriodIndex, formatDate, grams, mealForPeriod } from '../utils.js';

const FILTERS = ['Vegetarian', 'Vegan', 'Made without Gluten'];
const BADGE = { menu: 'menu cal', estimate: 'estimate' };

function saved(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function filterStations(stations, query, filters) {
  const q = query.trim().toLowerCase();
  return stations
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (it) => (!q || it.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) && filters.every((f) => it.tags.includes(f)),
      ),
    }))
    .filter((s) => s.items.length);
}

function StationList({ stations, searching, onSelect, onQuickAdd }) {
  const [collapsed, setCollapsed] = useState({});
  const [justAdded, setJustAdded] = useState({});

  function quickAdd(it, key) {
    onQuickAdd(it);
    setJustAdded((s) => ({ ...s, [key]: true }));
    setTimeout(() => setJustAdded((s) => ({ ...s, [key]: false })), 1500);
  }

  if (!stations.length) return <p className="notice">Nothing matches.</p>;

  return stations.map((s) => {
    const isCollapsed = !searching && collapsed[s.name];
    return (
      <section key={s.name} className="card station">
        <button className="station-head" onClick={() => setCollapsed((c) => ({ ...c, [s.name]: !c[s.name] }))} aria-expanded={!isCollapsed}>
          <h3>{s.name === s.name.toLowerCase() ? capitalize(s.name) : s.name}</h3>
          <span className="count">
            {s.items.length} <Icon name={isCollapsed ? 'right' : 'down'} size={13} />
          </span>
        </button>
        {!isCollapsed && (
          <ul className="items">
            {s.items.map((it, i) => {
              const key = `${s.name}-${it.id}-${i}`;
              return (
                <li key={key}>
                  <button className="item" onClick={() => onSelect(it)}>
                    <span className="item-name">{it.name}</span>
                    <span className="kpcf-row">
                      <span><b>{it.calories ?? '–'}</b> cal</span>
                      <span>P <b>{grams(it.protein)}</b></span>
                      <span>C <b>{grams(it.carbs)}</b></span>
                      <span>F <b>{grams(it.fat)}</b></span>
                      {it.serving && <span>· {it.serving}</span>}
                      {BADGE[it.basis] && <span className="estimate">{BADGE[it.basis]}</span>}
                    </span>
                  </button>
                  <button className={`add-btn ${justAdded[key] ? 'done' : ''}`} onClick={() => quickAdd(it, key)} aria-label={`Add ${it.name}`}>
                    <Icon name={justAdded[key] ? 'check' : 'plus'} size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  });
}

function HallsMenu({ menus, error, today, mealHint, onSelect, onQuickAdd }) {
  const [hallId, setHallId] = useState(() => saved('pp.hall'));
  const [periodIdx, setPeriodIdx] = useState(0);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState([]);

  const hall = menus?.halls.find((h) => h.id === hallId) ?? menus?.halls[0];
  const periods = hall?.periods ?? [];
  const period = periods[periodIdx];

  // Jump to the meal happening now (or the one asked for) whenever the hall changes.
  useEffect(() => {
    if (!hall) return;
    const hinted = mealHint ? hall.periods.findIndex((p) => mealForPeriod(p.name) === mealHint.meal) : -1;
    setPeriodIdx(hinted >= 0 ? hinted : currentPeriodIndex(hall.periods));
  }, [hall?.id, mealHint?.n]);

  // Keep the selected meal chip visible in the horizontally scrolling row.
  const chipsRef = useRef(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.children[periodIdx];
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - row.offsetLeft - 14, behavior: 'smooth' });
  }, [periodIdx, hall?.id]);

  const stations = useMemo(() => (period ? filterStations(period.stations, query, filters) : []), [period, query, filters]);

  if (error) return <p className="notice">Couldn’t load menus ({error}). Check your connection and reopen the app.</p>;
  if (!menus) return <p className="notice">Loading menus…</p>;

  const nowIdx = currentPeriodIndex(periods);

  return (
    <>
      {menus.date !== today && <p className="notice warn">Showing the menu from {formatDate(menus.date)}. Today’s hasn’t been fetched yet.</p>}

      <div className="segmented" role="tablist" aria-label="Dining hall" style={{ marginBottom: 10 }}>
        {menus.halls.map((h) => (
          <button
            key={h.id}
            role="tab"
            aria-selected={h.id === hall.id}
            className={h.id === hall.id ? 'active' : ''}
            onClick={() => {
              setHallId(h.id);
              save('pp.hall', h.id);
            }}
          >
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
                {p.name}
                {i === nowIdx && menus.date === today ? ' · now' : ''}
              </button>
            ))}
          </div>

          <label className="search">
            <Icon name="search" size={16} />
            <input type="search" placeholder={`Search ${period?.name.toLowerCase() ?? 'menu'}`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="chips" style={{ marginBottom: 12 }}>
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

          {period && <p className="sub" style={{ margin: '-4px 4px 10px' }}>{period.label}</p>}

          <StationList
            key={`${hall.id}-${periodIdx}`}
            stations={stations}
            searching={query.trim() !== '' || filters.length > 0}
            onSelect={(it) => onSelect(it, hall, period)}
            onQuickAdd={(it) => onQuickAdd(it, hall, period)}
          />

          <p className="fine">
            Menu from <a href={hall.url} target="_blank" rel="noreferrer">elondining.com</a>, updated{' '}
            {new Date(menus.fetchedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            Items and nutrition can change; check with dining staff about allergies.
          </p>
        </>
      )}
    </>
  );
}

const RETAIL_PERIOD = { name: 'Retail', retail: true };

function RetailMenu({ onSelect, onQuickAdd, onScan }) {
  const [spotId, setSpotId] = useState(() => saved('pp.spot'));
  const [query, setQuery] = useState('');
  const spot = RETAIL.find((s) => s.id === spotId) ?? RETAIL[0];
  const place = { name: spot.name, retail: true };
  const stations = useMemo(() => filterStations(spot.sections, query, []), [spot, query]);

  return (
    <>
      <div className="chips scroll" role="tablist" aria-label="Retail spot" style={{ marginBottom: 10 }}>
        {RETAIL.map((s) => (
          <button
            key={s.id}
            className={`chip ${s.id === spot.id ? 'active' : ''}`}
            onClick={() => {
              setSpotId(s.id);
              setQuery('');
              save('pp.spot', s.id);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {spot.scanOnly ? (
        <section className="card">
          <h3>{spot.name}</h3>
          <p className="sub" style={{ margin: '4px 0 12px' }}>Snacks and drinks here are packaged, so scan the barcode to log them.</p>
          <button className="btn primary block photo-btn" onClick={onScan}>
            <Icon name="barcode" size={18} /> Scan a barcode
          </button>
        </section>
      ) : (
        <>
          <p className="sub" style={{ margin: '0 4px 8px' }}>
            {spot.where} · {spot.url ? <a href={spot.url} target="_blank" rel="noreferrer">{spot.source}</a> : spot.source}
            {spot.hint && <><br />{spot.hint}</>}
          </p>
          <label className="search">
            <Icon name="search" size={16} />
            <input type="search" placeholder={`Search ${spot.name}`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <StationList
            key={spot.id}
            stations={stations}
            searching={query.trim() !== ''}
            onSelect={(it) => onSelect(it, place, RETAIL_PERIOD)}
            onQuickAdd={(it) => onQuickAdd(it, place, RETAIL_PERIOD)}
          />
          <p className="fine">
            “menu cal” means the calories are on Elon’s menu and the macros are estimated. “estimate” means the spot doesn’t publish nutrition, so all values are estimates.
          </p>
        </>
      )}
    </>
  );
}

export default function MenuView({ menus, error, day, today, mealHint, onSelect, onQuickAdd, onScan }) {
  const [source, setSource] = useState(() => saved('pp.menuSource') ?? 'halls');

  // Coming from a meal's + button always means the dining halls.
  useEffect(() => {
    if (mealHint) setSource('halls');
  }, [mealHint?.n]);

  function pick(s) {
    setSource(s);
    save('pp.menuSource', s);
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">{source === 'halls' ? 'Today’s menus' : 'Cafés and restaurants on campus'}</div>
          <h1>{source === 'halls' ? 'Dining halls' : 'Retail'}</h1>
        </div>
      </header>

      {day !== today && <p className="notice warn">Adding to {formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}.</p>}

      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={source === 'halls' ? 'active' : ''} onClick={() => pick('halls')}>Dining halls</button>
        <button className={source === 'retail' ? 'active' : ''} onClick={() => pick('retail')}>Retail</button>
      </div>

      {source === 'halls' ? (
        <HallsMenu menus={menus} error={error} today={today} mealHint={mealHint} onSelect={onSelect} onQuickAdd={onQuickAdd} />
      ) : (
        <RetailMenu onSelect={onSelect} onQuickAdd={onQuickAdd} onScan={onScan} />
      )}
    </div>
  );
}
