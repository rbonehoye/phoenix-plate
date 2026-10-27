// Progress ring. `segments` draws several colored arcs end to end
// (fractions of the whole); otherwise `value / max` fills one arc.
export default function Ring({ size = 120, stroke = 10, value = 0, max = 1, color = 'var(--maroon)', segments, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arcs = segments ?? [{ frac: max > 0 ? Math.min(1, value / max) : 0, color }];
  let offset = 0;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {arcs.map((a, i) => {
          const len = Math.max(0, a.frac) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeLinecap={segments ? 'butt' : 'round'}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          );
          offset += len;
          return len > 0 ? el : null;
        })}
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}
