interface LogoProps {
  size?: number;
  /** Renders the mark alone, without the surrounding tile. */
  bare?: boolean;
}

/**
 * The mark: a page with one band of it highlighted — the whole app in a glyph.
 * The page is drawn in `currentColor` so it inherits its context; the band is
 * always the brand gold, which is the one thing that should not shift.
 */
export function Logo({ size = 32, bare = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Paperfolio"
      className={bare ? "logo-mark logo-mark--bare" : "logo-mark"}
    >
      {!bare && <rect width="40" height="40" rx="9" fill="var(--gold-wash)" />}
      <rect
        x="10.1"
        y="7.1"
        width="19.8"
        height="25.8"
        rx="2.9"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M14.6 14.4h10.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* The highlight — the only saturated element in the mark. */}
      <rect x="13.7" y="18.2" width="12.6" height="4.4" rx="2.2" fill="var(--gold)" />
      <path
        d="M14.6 27.1h7.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
