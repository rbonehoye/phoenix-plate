import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Ring from './Ring.jsx';
import { BASIS_NOTE } from '../retail.js';
import { amount, grams, mealForPeriod, mealForTime } from '../utils.js';

const STEP = 0.5;

export default function ItemSheet({ item, hall, period, onClose, onAdd }) {
  const [servings, setServings] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Share of calories from each macro, for the ring
  const kcal = { protein: (item.protein ?? 0) * 4, carbs: (item.carbs ?? 0) * 4, fat: (item.fat ?? 0) * 9 };
  const sum = kcal.protein + kcal.carbs + kcal.fat || 1;
  const segments = [
    { frac: kcal.protein / sum, color: 'var(--maroon)' },
    { frac: kcal.carbs / sum, color: 'var(--gold)' },
    { frac: kcal.fat / sum, color: 'var(--slate)' },
  ];
  const meal = period.retail ? mealForTime() : mealForPeriod(period.name);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <div className="sub">{hall.name}{period.retail ? '' : ` · ${period.name}`}</div>
        <h2>{item.name}</h2>
        {(item.basis === 'menu' || item.basis === 'estimate') && <p className="notice warn" style={{ fontSize: 13, padding: '8px 12px', marginTop: -4 }}>{BASIS_NOTE[item.basis]}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14 }}>
          <Ring size={100} stroke={10} segments={segments}>
            <b className="ring-big" style={{ fontSize: 22 }}>{grams(item.calories, servings)}</b>
            <span>cal</span>
          </Ring>
          <div className="macro-legend">
            <div><span><span className="dot c-protein" />Protein</span><b className="num">{amount(item.protein, servings, 'g')}</b></div>
            <div><span><span className="dot c-carbs" />Carbs</span><b className="num">{amount(item.carbs, servings, 'g')}</b></div>
            <div><span><span className="dot c-fat" />Fat</span><b className="num">{amount(item.fat, servings, 'g')}</b></div>
          </div>
        </div>

        <div className="sub">Servings{item.serving && ` · ${item.serving} each`}</div>
        <div className="stepper">
          <button onClick={() => setServings((s) => Math.max(STEP, s - STEP))} aria-label="Fewer servings"><Icon name="minus" size={18} /></button>
          <b>{servings}</b>
          <button onClick={() => setServings((s) => Math.min(10, s + STEP))} aria-label="More servings"><Icon name="plus" size={18} /></button>
        </div>

        <dl className="facts">
          <div><dt>Fiber</dt><dd>{amount(item.fiber, servings, 'g')}</dd></div>
          <div><dt>Sugar</dt><dd>{amount(item.sugar, servings, 'g')}</dd></div>
          <div><dt>Sodium</dt><dd>{amount(item.sodium, servings, 'mg')}</dd></div>
        </dl>

        {(item.basis === 'official' || item.basis === 'label') && <p className="sub" style={{ margin: '-6px 2px 12px' }}>{BASIS_NOTE[item.basis]}</p>}
        {(item.tags.length > 0 || item.allergens.length > 0) && (
          <div className="tags">
            {item.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            {item.allergens.map((a) => <span key={a} className="tag allergen">Contains {a.toLowerCase()}</span>)}
          </div>
        )}

        <button className="btn primary block" onClick={() => onAdd(servings)}>
          Add to {meal.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
