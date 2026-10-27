import { useEffect, useState } from 'react';

const STEPS = [0.5, 1, 1.5, 2, 3];

export default function ItemSheet({ item, hall, period, onClose, onAdd }) {
  const [servings, setServings] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scaled = (n) => (n == null ? '—' : Math.round(n * servings));
  const rows = [
    ['Protein', item.protein, 'g'],
    ['Carbs', item.carbs, 'g'],
    ['Fat', item.fat, 'g'],
    ['Fiber', item.fiber, 'g'],
    ['Sugar', item.sugar, 'g'],
    ['Sodium', item.sodium, 'mg'],
  ];

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={item.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>{item.name}</h2>
        <p className="muted">
          {hall.name} · {period.name}
          {item.serving && ` · ${item.serving} per serving`}
        </p>

        <div className="sheet-cal">
          <span className="summary-big">{scaled(item.calories)}</span> calories
        </div>

        <div className="stepper" role="group" aria-label="Servings">
          {STEPS.map((s) => (
            <button key={s} className={`chip ${s === servings ? 'active' : ''}`} onClick={() => setServings(s)}>
              {s}×
            </button>
          ))}
        </div>

        <dl className="facts">
          {rows.map(([label, v, unit]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{scaled(v)}{v != null && unit}</dd>
            </div>
          ))}
        </dl>

        {(item.tags.length > 0 || item.allergens.length > 0) && (
          <div className="tags">
            {item.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            {item.allergens.map((a) => <span key={a} className="tag allergen">Contains {a.toLowerCase()}</span>)}
          </div>
        )}

        <div className="sheet-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onAdd(servings)}>
            Add {servings !== 1 ? `${servings} servings` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
