import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { api } from "../api";
import { pickPdf } from "../dialogs";
import { LibrarySkeleton } from "../components/Skeleton";
import { PaperFormModal, toPatch } from "../components/PaperFormModal";
import type { PaperFormValues } from "../components/PaperFormModal";
import type { Paper, PaperDraft } from "../types";

const STATUS_LABELS: Record<string, string> = {
  unread: "Unread",
  reading: "Reading",
  read: "Read",
};

export function LibraryPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await api.listPapers();
      setPapers(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const closeForm = () => {
    setShowForm(false);
    setPdfPath(null);
  };

  const handleSubmit = async (values: PaperFormValues) => {
    const draft: PaperDraft = { ...toPatch(values), pdf_source_path: pdfPath };
    setSaving(true);
    try {
      const created = await api.createPaper(draft);
      setPapers((prev) => [created, ...prev]);
      closeForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="library">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <Link to="/" className="topbar__mark" aria-label="Paperfolio home">
              <Logo size={38} />
            </Link>
            <div>
              <h1>Paperfolio</h1>
              <p className="tagline">Read, highlight &amp; annotate research papers</p>
            </div>
          </div>
          <button className="btn btn--primary" onClick={() => setShowForm(true)}>
            + Add paper
          </button>
        </div>
      </header>

      <main className="library__main">
        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <LibrarySkeleton />
        ) : papers.length === 0 ? (
          <div className="empty-state">
            <p>Your library is empty.</p>
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              Add your first paper
            </button>
          </div>
        ) : (
          <div className="paper-grid">
            {papers.map((p) => (
              <Link key={p.id} to={`/paper/${p.id}`} className="paper-card">
                <div className="paper-card__top">
                  <span className={`status status--${p.status}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  {p.year ? <span className="paper-card__year">{p.year}</span> : null}
                </div>
                <h2 className="paper-card__title">{p.title}</h2>
                {p.authors ? (
                  <p className="paper-card__authors">{p.authors}</p>
                ) : null}
                {p.venue ? <p className="paper-card__venue">{p.venue}</p> : null}
                <div className="paper-card__counts">
                  <span title="Highlights">🖍️ {p.highlight_count ?? 0}</span>
                  <span title="Notes">📝 {p.note_count ?? 0}</span>
                  <span title="Ideas">💡 {p.idea_count ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <PaperFormModal
          heading="Add a paper"
          submitLabel="Add paper"
          saving={saving}
          pdf={{
            path: pdfPath,
            onPick: async () => {
              const path = await pickPdf();
              if (path) setPdfPath(path);
            },
            onClear: () => setPdfPath(null),
          }}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
