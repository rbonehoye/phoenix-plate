import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import SheetTop from './SheetTop.jsx';
import Ring from './Ring.jsx';
import { cameraSupported, decodeImageFile, isBarcode, lookupBarcode, recentFoods, startCamera } from '../barcode.js';
import { MEALS, amount, grams } from '../utils.js';

const STEP = 0.5;

function cameraMessage(err) {
  if (err?.name === 'NotAllowedError') return 'Camera access is blocked. Allow it for this site in your phone’s settings, or use a photo.';
  if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return 'No camera found. Use a photo or type the number instead.';
  return 'The camera couldn’t start. Use a photo or type the number instead.';
}

function FoodResult({ food, meal, onAdd, onRescan }) {
  const [basis, setBasis] = useState(food.perServing ? 'serving' : '100g');
  const [servings, setServings] = useState(1);
  const v = basis === 'serving' ? food.perServing : food.per100;
  const kcal = { protein: (v.protein ?? 0) * 4, carbs: (v.carbs ?? 0) * 4, fat: (v.fat ?? 0) * 9 };
  const sum = kcal.protein + kcal.carbs + kcal.fat || 1;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        {food.image ? <img className="product-img" src={food.image} alt="" /> : <span className="product-img"><Icon name="apple" /></span>}
        <div className="grow">
          <h2 style={{ margin: 0 }}>{food.name}</h2>
          <div className="sub">{[food.brand, food.code].filter(Boolean).join(' · ')}</div>
        </div>
      </div>

      {food.perServing && food.per100 && (
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button className={basis === 'serving' ? 'active' : ''} onClick={() => setBasis('serving')}>Per serving{food.servingLabel && ` (${food.servingLabel})`}</button>
          <button className={basis === '100g' ? 'active' : ''} onClick={() => setBasis('100g')}>Per 100 g</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14 }}>
        <Ring
          size={100}
          stroke={10}
          segments={[
            { frac: kcal.protein / sum, color: 'var(--maroon)' },
            { frac: kcal.carbs / sum, color: 'var(--gold)' },
            { frac: kcal.fat / sum, color: 'var(--slate)' },
          ]}
        >
          <b className="ring-big" style={{ fontSize: 22 }}>{grams(v.calories, servings)}</b>
          <span>cal</span>
        </Ring>
        <div className="macro-legend">
          <div><span><span className="dot c-protein" />Protein</span><b className="num">{amount(v.protein, servings, 'g')}</b></div>
          <div><span><span className="dot c-carbs" />Carbs</span><b className="num">{amount(v.carbs, servings, 'g')}</b></div>
          <div><span><span className="dot c-fat" />Fat</span><b className="num">{amount(v.fat, servings, 'g')}</b></div>
        </div>
      </div>

      <div className="sub">{basis === 'serving' ? `Servings${food.servingLabel ? ` · ${food.servingLabel} each` : ''}` : 'Amount · 100 g each'}</div>
      <div className="stepper">
        <button onClick={() => setServings((s) => Math.max(STEP, s - STEP))} aria-label="Less"><Icon name="minus" size={18} /></button>
        <b>{servings}{basis === '100g' && ` × 100 g`}</b>
        <button onClick={() => setServings((s) => Math.min(20, s + STEP))} aria-label="More"><Icon name="plus" size={18} /></button>
      </div>

      <dl className="facts">
        <div><dt>Fiber</dt><dd>{amount(v.fiber, servings, 'g')}</dd></div>
        <div><dt>Sugar</dt><dd>{amount(v.sugar, servings, 'g')}</dd></div>
        <div><dt>Sodium</dt><dd>{amount(v.sodium, servings, 'mg')}</dd></div>
      </dl>

      <button
        className="btn primary block"
        onClick={() =>
          onAdd({
            name: food.brand && !food.name.toLowerCase().includes(food.brand.toLowerCase()) ? `${food.name} (${food.brand})` : food.name,
            hall: null,
            period: meal,
            meal,
            serving: basis === 'serving' ? food.servingLabel : '100 g',
            servings,
            calories: v.calories,
            protein: v.protein,
            carbs: v.carbs,
            fat: v.fat,
            barcode: food.code,
          })
        }
      >
        Add to {meal.toLowerCase()}
      </button>
      <button className="btn block link-btn" onClick={onRescan}>Scan something else</button>
      <p className="fine" style={{ margin: '10px 2px 0' }}>Nutrition from Open Food Facts, a crowd-sourced database. Check the label if something looks off.</p>
    </>
  );
}

export default function ScanSheet({ meal: initialMeal, onClose, onAdd, onManual }) {
  const [meal, setMeal] = useState(initialMeal);
  const [mode, setMode] = useState(cameraSupported() ? 'camera' : 'nocamera'); // camera | nocamera | busy | found | notfound
  const [message, setMessage] = useState('');
  const [food, setFood] = useState(null);
  const [typed, setTyped] = useState('');
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const recent = recentFoods();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Run the camera only while in camera mode.
  useEffect(() => {
    if (mode !== 'camera') return;
    let stop = null;
    let cancelled = false;
    startCamera(videoRef.current, (code) => handleCode(code))
      .then((s) => (cancelled ? s() : (stop = s)))
      .catch((err) => {
        if (cancelled) return;
        setMessage(cameraMessage(err));
        setMode('nocamera');
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [mode]);

  async function handleCode(code) {
    setMode('busy');
    setMessage(`Looking up ${code}…`);
    try {
      const f = await lookupBarcode(code);
      if (!f || f.noNutrition) {
        setFood(f ?? { code });
        setMode('notfound');
        setMessage(f ? `Found “${f.name}”, but it has no nutrition info yet.` : `Barcode ${code} isn’t in the food database yet.`);
      } else {
        setFood(f);
        setMode('found');
      }
    } catch {
      setMode('nocamera');
      setMessage('Couldn’t reach the food database. Check your connection and try again.');
    }
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMode('busy');
    setMessage('Reading the barcode…');
    try {
      const code = await decodeImageFile(file);
      if (code) {
        handleCode(code);
      } else {
        setMode('nocamera');
        setMessage('No barcode found in that photo. Try a closer, sharper shot with the whole barcode in frame, or type the number.');
      }
    } catch (err) {
      setMode('nocamera');
      setMessage(err.message);
    }
  }

  function submitTyped(e) {
    e.preventDefault();
    const code = typed.replace(/\D/g, '');
    if (!isBarcode(code)) {
      setMessage('Enter the 8, 12 or 13 digits under the barcode.');
      return;
    }
    handleCode(code);
  }

  const scanning = mode === 'camera' || mode === 'nocamera' || mode === 'busy';

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Scan a barcode" onClick={(e) => e.stopPropagation()}>
        <SheetTop onClose={onClose} />
        <div className="chips" style={{ marginBottom: 12 }}>
          {MEALS.map((m) => (
            <button key={m} className={`chip ${m === meal ? 'active' : ''}`} onClick={() => setMeal(m)}>
              {m}
            </button>
          ))}
        </div>

        {mode === 'found' && food && (
          <FoodResult key={food.code} food={food} meal={meal} onAdd={onAdd} onRescan={() => { setFood(null); setMessage(''); setMode(cameraSupported() ? 'camera' : 'nocamera'); }} />
        )}

        {mode === 'notfound' && (
          <>
            <h2>Not found</h2>
            <p className="sub" style={{ marginTop: -6 }}>{message}</p>
            <button className="btn primary block" onClick={() => onManual(food?.name ?? '')}>Enter it yourself</button>
            <button className="btn block link-btn" onClick={() => { setMessage(''); setMode(cameraSupported() ? 'camera' : 'nocamera'); }}>Scan again</button>
          </>
        )}

        {scanning && (
          <>
            <h2>Scan a barcode</h2>
            {mode === 'camera' && (
              <div className="scanner">
                <video ref={videoRef} playsInline muted autoPlay />
                <div className="scan-frame" />
                <div className="scan-hint">Point at the barcode</div>
              </div>
            )}
            {mode === 'busy' && <div className="scan-busy"><span className="spinner" />{message}</div>}
            {mode === 'nocamera' && message && <p className="notice warn">{message}</p>}

            {mode !== 'busy' && (
              <>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                <button className="btn block photo-btn" onClick={() => fileRef.current.click()}>
                  <Icon name="camera" size={18} /> {mode === 'camera' ? 'Use a photo instead' : 'Take or choose a photo'}
                </button>

                <form className="log-weight" onSubmit={submitTyped}>
                  <input className="input" inputMode="numeric" placeholder="Or type the barcode number" value={typed} onChange={(e) => { setMessage(''); setTyped(e.target.value.replace(/[^\d ]/g, '')); }} />
                  <button className="btn primary">Look up</button>
                </form>
                {mode === 'camera' && message && <p className="errors" style={{ paddingLeft: 0, marginTop: 6 }}>{message}</p>}

                {recent.length > 0 && (
                  <>
                    <h3 style={{ margin: '16px 0 4px' }}>Recent scans</h3>
                    <ul className="items">
                      {recent.map((f) => (
                        <li key={f.code}>
                          <button className="item" onClick={() => { setFood(f); setMode('found'); }}>
                            <span className="item-name">{f.name}</span>
                            <span className="kpcf-row">{f.brand && <span>{f.brand}</span>}<span><b>{grams((f.perServing ?? f.per100).calories)}</b> cal {f.perServing ? 'per serving' : 'per 100 g'}</span></span>
                          </button>
                          <Icon name="right" size={16} className="muted" />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
            <button className="btn block link-btn" onClick={() => onManual('')}>Enter food without a barcode</button>
          </>
        )}
      </div>
    </div>
  );
}
