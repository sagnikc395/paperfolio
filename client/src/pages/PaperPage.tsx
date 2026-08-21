import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api } from "../api";
import { pickPdf, confirmDestructive } from "../dialogs";
import { PageSkeleton, PaperHeaderSkeleton } from "../components/Skeleton";
import { PaperFormModal, toPatch } from "../components/PaperFormModal";
import type { PaperFormValues } from "../components/PaperFormModal";
import type {
  Paper,
  Highlight,
  Note,
  Idea,
  Comment,
  ScaledPosition,
  PaperStatus,
} from "../types";
import { PdfViewer } from "../components/PdfViewer";
import { HighlightsSidebar } from "../components/HighlightsSidebar";
import { NotesPanel } from "../components/NotesPanel";
import { IdeasPanel } from "../components/IdeasPanel";

type Tab = "reader" | "notes" | "ideas";

const STATUS_OPTIONS: { value: PaperStatus; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

export function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tab, setTab] = useState<Tab>("reader");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollToRef = useRef<((highlight: Highlight) => void) | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [p, hs, ns, is] = await Promise.all([
        api.getPaper(id),
        api.listHighlights(id),
        api.listNotes(id),
        api.listIdeas(id),
      ]);
      setPaper(p);
      setHighlights(hs);
      setNotes(ns);
      setIdeas(is);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // PDFs live outside the bundle, so they are served through Tauri's asset
  // protocol rather than a plain path.
  useEffect(() => {
    let cancelled = false;
    const name = paper?.pdf_path;
    if (!name) {
      setPdfUrl(null);
      return;
    }
    api
      .pdfPath(name)
      .then((absolute) => {
        if (!cancelled) setPdfUrl(convertFileSrc(absolute));
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [paper?.pdf_path]);

  const addHighlight = async (data: {
    content: string;
    comment: Comment;
    position: ScaledPosition;
  }) => {
    if (!id) return;
    try {
      const created = await api.createHighlight({
        paper_id: id,
        content: data.content,
        comment: data.comment,
        position: data.position,
      });
      setHighlights((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteHighlight = async (highlightId: string) => {
    try {
      await api.deleteHighlight(highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateHighlightComment = async (highlightId: string, comment: Comment) => {
    try {
      const updated = await api.updateHighlight(highlightId, { comment });
      setHighlights((prev) =>
        prev.map((h) => (h.id === highlightId ? updated : h))
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createNote = async (data: { title: string; content: string }) => {
    if (!id) return;
    try {
      const created = await api.createNote({ paper_id: id, ...data });
      setNotes((prev) => [created, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateNote = async (
    noteId: string,
    data: { title: string; content: string }
  ) => {
    try {
      const updated = await api.updateNote(noteId, data);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createIdea = async (content: string) => {
    if (!id) return;
    try {
      const created = await api.createIdea({ paper_id: id, content });
      setIdeas((prev) => [created, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteIdea = async (ideaId: string) => {
    try {
      await api.deleteIdea(ideaId);
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveDetails = async (values: PaperFormValues) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.updatePaper(id, toPatch(values));
      setPaper(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: PaperStatus) => {
    if (!id) return;
    try {
      const updated = await api.updatePaper(id, { status });
      setPaper(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const choosePdf = async () => {
    if (!id) return;
    try {
      const path = await pickPdf();
      if (!path) return;
      const updated = await api.setPaperPdf(id, path);
      setPaper(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deletePaper = async () => {
    if (!id) return;
    const ok = await confirmDestructive(
      "Delete this paper and all its highlights, notes and ideas?",
      paper?.title ?? "Delete paper"
    );
    if (!ok) return;
    try {
      await api.deletePaper(id);
      navigate("/library");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="paper-page" aria-busy="true">
        <PaperHeaderSkeleton />
        <div className="paper-page__body">
          <div className="reader-layout">
            <div className="reader-layout__pdf">
              <PageSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="paper-page">
        <div className="paper-page__header">
          <Link to="/library" className="back-link">
            ← Library
          </Link>
        </div>
        <div className="page-message">
          <p className="pdf-message__title">This paper is no longer in your library</p>
          <p className="pdf-message__hint">
            It may have been deleted. Head back to the library to pick another.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-page">
      <header className="paper-page__header">
        <div className="paper-page__title-row">
          <Link to="/library" className="back-link">
            ← Library
          </Link>
          <h1>{paper.title}</h1>
        </div>
        <p className="paper-page__meta">
          {paper.authors && <span>{paper.authors}</span>}
          {paper.venue && <span className="dot">·</span>}
          {paper.venue && <span>{paper.venue}</span>}
          {paper.year && <span className="dot">·</span>}
          {paper.year && <span>{paper.year}</span>}
        </p>
        {paper.url && (
          <a
            className="paper-page__url"
            href={paper.url}
            target="_blank"
            rel="noreferrer"
          >
            {paper.url}
          </a>
        )}
        <div className="paper-page__controls">
          <select
            value={paper.status}
            onChange={(e) => changeStatus(e.target.value as PaperStatus)}
            className={`status-select status-select--${paper.status}`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setEditing(true)}>
            Edit details
          </button>
          <button className="btn" onClick={choosePdf}>
            {paper.pdf_path ? "Replace PDF" : "Add PDF"}
          </button>
          <button className="btn btn--danger" onClick={deletePaper}>
            Delete
          </button>
        </div>
      </header>

      {error && <div className="alert alert--error">{error}</div>}

      <nav className="tabs">
        {(
          [
            ["reader", `Reader (${highlights.length})`],
            ["notes", `Notes (${notes.length})`],
            ["ideas", `Ideas (${ideas.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`tab ${tab === key ? "tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="paper-page__body">
        {tab === "reader" &&
          (pdfUrl ? (
            <div className="reader-layout">
              <div className="reader-layout__pdf">
                <PdfViewer
                  url={pdfUrl}
                  highlights={highlights}
                  onAddHighlight={addHighlight}
                  onDeleteHighlight={deleteHighlight}
                  scrollToRef={scrollToRef}
                />
              </div>
              <HighlightsSidebar
                highlights={highlights}
                scrollToRef={scrollToRef}
                onDelete={deleteHighlight}
                onUpdateComment={updateHighlightComment}
              />
            </div>
          ) : (
            <div className="upload-prompt">
              <p>No PDF added yet.</p>
              <button className="btn btn--primary" onClick={choosePdf}>
                Choose a PDF…
              </button>
            </div>
          ))}

        {tab === "notes" && (
          <NotesPanel
            notes={notes}
            onCreate={createNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
          />
        )}

        {tab === "ideas" && (
          <IdeasPanel ideas={ideas} onCreate={createIdea} onDelete={deleteIdea} />
        )}
      </main>

      {editing && (
        <PaperFormModal
          heading="Edit details"
          submitLabel="Save changes"
          saving={saving}
          initial={{
            title: paper.title,
            authors: paper.authors ?? "",
            abstract: paper.abstract ?? "",
            year: paper.year != null ? String(paper.year) : "",
            venue: paper.venue ?? "",
            url: paper.url ?? "",
          }}
          onSubmit={saveDetails}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
