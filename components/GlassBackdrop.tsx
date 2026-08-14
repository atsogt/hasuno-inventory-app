function LotusLeaf({ className }: { className: string }) {
  return (
    <svg
      className={`lotus-plant ${className} dark:hidden`}
      viewBox="0 0 90 112"
      fill="none"
      role="img"
      aria-label="A small lotus leaf"
    >
      <path
        d="M46 66 C 43 80, 49 96, 44 108"
        stroke="rgb(var(--success))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M50 42 L 73.2 35.8 A 24 24 0 1 1 73.2 48.2 Z"
        fill="rgb(var(--success) / 0.85)"
      />
      <g stroke="rgb(var(--card))" strokeWidth="1.2" strokeLinecap="round" opacity="0.6">
        <line x1="50" y1="42" x2="57" y2="61" />
        <line x1="50" y1="42" x2="34.4" y2="55.1" />
        <line x1="50" y1="42" x2="32.3" y2="31.8" />
        <line x1="50" y1="42" x2="57" y2="22.8" />
      </g>
    </svg>
  );
}

export default function GlassBackdrop() {
  return (
    <div className="liquid-glass" aria-hidden="true">
      <span className="blob blob-1" />
      <span className="blob blob-2" />
      <span className="blob blob-3" />
      <LotusLeaf className="lotus-left" />
      <LotusLeaf className="lotus-right" />
    </div>
  );
}
