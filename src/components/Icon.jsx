// Small outline icon set (24x24, stroke = currentColor)
const PATHS = {
  home: <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />,
  menu: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 7h3v11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chart: <path d="M5 20V11M12 20V5M19 20v-8" />,
  settings: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  flame: <path d="M12 3c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3 1.5-4.5 2.5-6.5C9.5 9 10 10.5 10 12c1.5-1.5 2.5-5 2-9z" />,
  coffee: <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  moon: <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />,
  apple: <path d="M12 7c-2-2-7-1-7 4 0 5 3 9 5 9 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-9 0-5-5-6-7-4zM12 7c0-2 1-3 3-4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" />
    </>
  ),
  barcode: <path d="M4 5v14M7 5v14M10 5v14M12 5v14M14 5v14M17 5v14M20 5v14" strokeWidth="1.6" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  store: <path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6" />,
  scale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9 9.5a4 4 0 0 1 6 0L12.5 12" />
    </>
  ),
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
