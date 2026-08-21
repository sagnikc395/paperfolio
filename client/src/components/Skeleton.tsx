/**
 * Loading states.
 *
 * The app is about reading typeset pages, so its loading states are drawn as
 * pages before they have ink: the same anatomy as the real content, in place,
 * so loading resolves into the page rather than being replaced by it. No
 * spinners — the one in pdf.js is hidden in CSS.
 */

/**
 * Widths of the "text" lines in each body paragraph, as percentages. Enough
 * paragraphs to run the full height of a sheet — a page of a paper is full of
 * type, and a column that stops halfway reads as broken rather than loading.
 * The sheet crops whatever does not fit, exactly as a real page does.
 */
const PARAGRAPHS = [
  [100, 100, 100, 100, 62],
  [100, 100, 100, 88],
  [100, 100, 100, 100, 100, 47],
  [100, 100, 100, 74],
  [100, 100, 100, 100, 91],
  [100, 100, 56],
  [100, 100, 100, 100, 68],
];

/** Marginalia sit beside the body column, sparser than it. */
const MARGIN_NOTES = [
  [100, 100, 100, 70],
  [100, 80],
  [100, 100, 64],
  [100, 100, 100, 45],
  [100, 100, 82],
  [100, 60],
];

function Paragraph({ widths }: { widths: number[] }) {
  return (
    <div className="page-skeleton__para">
      {widths.map((w, i) => (
        <div key={i} className="skeleton skeleton--line" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** A blank sheet with the ghost of an academic page's structure. */
export function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="page-skeleton__sheet skeleton-group">
        <div className="skeleton page-skeleton__folio" />
        <div className="page-skeleton__rule" />
        <div className="page-skeleton__title">
          <div className="skeleton skeleton--line" style={{ width: "76%" }} />
          <div className="skeleton skeleton--line" style={{ width: "44%" }} />
        </div>
        <div className="page-skeleton__columns">
          <div className="page-skeleton__body">
            {PARAGRAPHS.map((widths, i) => (
              <Paragraph key={i} widths={widths} />
            ))}
          </div>
          <div className="page-skeleton__margin">
            {MARGIN_NOTES.map((widths, i) => (
              <Paragraph key={i} widths={widths} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors `.paper-card`, so the library grid keeps its shape while loading. */
export function PaperCardSkeleton() {
  return (
    <div className="paper-card paper-card--skeleton skeleton-group">
      <div className="paper-card__top">
        <div className="skeleton skeleton--pill" />
        <div className="skeleton skeleton--line" style={{ width: 32 }} />
      </div>
      <div className="page-skeleton__para">
        <div className="skeleton skeleton--line" style={{ width: "94%" }} />
        <div className="skeleton skeleton--line" style={{ width: "61%" }} />
      </div>
      <div className="skeleton skeleton--line" style={{ width: "72%" }} />
      <div className="paper-card__counts paper-card__counts--skeleton">
        <div className="skeleton skeleton--line" style={{ width: 34 }} />
        <div className="skeleton skeleton--line" style={{ width: 34 }} />
        <div className="skeleton skeleton--line" style={{ width: 34 }} />
      </div>
    </div>
  );
}

/** The library grid, mid-load. */
export function LibrarySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="paper-grid" aria-busy="true" aria-label="Loading library">
      {Array.from({ length: count }, (_, i) => (
        <PaperCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** The paper page's header bar, mid-load. */
export function PaperHeaderSkeleton() {
  return (
    <div className="paper-page__header skeleton-group">
      <div className="paper-page__title-row">
        <div className="skeleton skeleton--line" style={{ width: 58 }} />
        <div className="skeleton skeleton--line" style={{ width: 260, height: 15 }} />
      </div>
      <div className="skeleton skeleton--line" style={{ width: 180 }} />
      <div className="paper-page__controls">
        <div className="skeleton skeleton--control" style={{ width: 92 }} />
        <div className="skeleton skeleton--control" style={{ width: 108 }} />
      </div>
    </div>
  );
}
