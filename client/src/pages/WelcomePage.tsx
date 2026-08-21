import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Logo } from "../components/Logo";

interface Totals {
  papers: number;
  highlights: number;
  notes: number;
  ideas: number;
}

/** Plural that reads like a person wrote it. */
function count(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The screen the app opens on. Its job is to say what this is, show what is
 * already in the library, and get out of the way in one click.
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listPapers()
      .then((papers) => {
        if (cancelled) return;
        setTotals({
          papers: papers.length,
          highlights: papers.reduce((n, p) => n + (p.highlight_count ?? 0), 0),
          notes: papers.reduce((n, p) => n + (p.note_count ?? 0), 0),
          ideas: papers.reduce((n, p) => n + (p.idea_count ?? 0), 0),
        });
      })
      .catch(() => setTotals({ papers: 0, highlights: 0, notes: 0, ideas: 0 }));
    return () => {
      cancelled = true;
    };
  }, []);

  const empty = totals?.papers === 0;

  return (
    <div className="welcome">
      <main className="welcome__inner">
        <Logo size={76} />

        <h1 className="welcome__wordmark">Paperfolio</h1>
        <p className="welcome__tagline">
          Read, highlight and annotate research papers. Every paper gets its own
          space for its PDF, its highlights, and your notes.
        </p>

        <button
          className="btn btn--primary btn--lg"
          onClick={() => navigate("/library")}
        >
          {empty ? "Add your first paper" : "Open library"}
        </button>

        <div className="welcome__stats" aria-live="polite">
          {totals === null ? (
            <span className="welcome__stats-placeholder" />
          ) : empty ? (
            <span>Your library is empty</span>
          ) : (
            <>
              <span>{count(totals.papers, "paper")}</span>
              <span className="welcome__sep" />
              <span>{count(totals.highlights, "highlight")}</span>
              <span className="welcome__sep" />
              <span>{count(totals.notes, "note")}</span>
              <span className="welcome__sep" />
              <span>{count(totals.ideas, "idea")}</span>
            </>
          )}
        </div>
      </main>

      <footer className="welcome__footer">
        Stored in Documents / Paperfolio_Data
      </footer>
    </div>
  );
}
