import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { MEALS } from '../utils.js';

const digits = (v) => v.replace(/[^\d.]/g, '');

// Log food from outside the dining halls. `initial` prefills the form.
export default function AddSheet({ meal: initialMeal, initial, onClose, onAdd, onBrowseMenu, onScan }) {
  const [meal, setMeal] = useState(initialMeal);
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', ...initial });
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    setError('');
    setF((prev) => ({ ...prev, [k]: k === 'name' ? e.target.value : digits(e.target.value) }));
  };
  const num = (v) => (v === '' ? null : Number(v));

  function submit(e) {
    e.preventDefault();
    if (!Number(f.calories)) {
      setError('Enter the calories.');
      return;
    }
    onAdd({
      name: f.name.trim() || 'Quick add',
      hall: null,
      period: meal,
      meal,
      serving: null,
      servings: 1,
      calories: Number(f.calories),
      protein: num(f.protein),
      carbs: num(f.carbs),
      fat: num(f.fat),
    });
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label="Add food" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="grip" />
        <h2>Add food</h2>

        <button type="button" className="scan-cta" onClick={() => onScan(meal)}>
          <span className="setup-icon"><Icon name="barcode" /></span>
          <span className="grow">
            <b>Scan a barcode</b>
            <span className="sub" style={{ display: 'block' }}>Look up packaged food with your camera or a photo</span>
          </span>
          <Icon name="right" size={18} />
        </button>

        <div className="chips" style={{ marginBottom: 12 }}>
          {MEALS.map((m) => (
            <button type="button" key={m} className={`chip ${m === meal ? 'active' : ''}`} onClick={() => setMeal(m)}>
              {m}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Food</span>
          <input className="input" placeholder="Chipotle bowl" value={f.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span>Calories</span>
          <input className="input" inputMode="numeric" placeholder="650" value={f.calories} onChange={set('calories')} />
        </label>
        <div className="row-3">
          <label className="field"><span>Protein (g)</span><input className="input" inputMode="decimal" placeholder="40" value={f.protein} onChange={set('protein')} /></label>
          <label className="field"><span>Carbs (g)</span><input className="input" inputMode="decimal" placeholder="70" value={f.carbs} onChange={set('carbs')} /></label>
          <label className="field"><span>Fat (g)</span><input className="input" inputMode="decimal" placeholder="20" value={f.fat} onChange={set('fat')} /></label>
        </div>
        {error && <p className="errors" style={{ paddingLeft: 0 }}>{error}</p>}

        <button className="btn primary block" type="submit">Add to {meal.toLowerCase()}</button>
        <button className="btn block" type="button" style={{ marginTop: 8, background: 'none', color: 'var(--maroon)' }} onClick={onBrowseMenu}>
          Browse dining hall menus instead
        </button>
      </form>
    </div>
  );
}
