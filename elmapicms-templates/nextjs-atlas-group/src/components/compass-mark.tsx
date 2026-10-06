/** Decorative compass rose, drawn in CSS/SVG so the template never depends on stock photography. */
export function CompassMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="100" cy="100" r="98" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
      <circle cx="100" cy="100" r="2.5" fill="currentColor" fillOpacity="0.5" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const major = i % 6 === 0;
        const r1 = major ? 78 : 86;
        const r2 = 98;
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + r1 * Math.sin(rad);
        const y1 = 100 - r1 * Math.cos(rad);
        const x2 = 100 + r2 * Math.sin(rad);
        const y2 = 100 - r2 * Math.cos(rad);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeOpacity={major ? 0.55 : 0.22}
            strokeWidth={major ? 1.5 : 1}
          />
        );
      })}
      <path
        d="M100 24 L112 100 L100 176 L88 100 Z"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <path
        d="M24 100 L100 88 L176 100 L100 112 Z"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
    </svg>
  );
}
