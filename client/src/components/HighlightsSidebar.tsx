import { useState } from "react";
import type { MutableRefObject } from "react";
import type { Highlight, Comment } from "../types";

interface HighlightsSidebarProps {
  highlights: Highlight[];
  scrollToRef: MutableRefObject<((highlight: Highlight) => void) | null>;
  onDelete: (id: string) => void;
  onUpdateComment: (id: string, comment: Comment) => void;
}

export function HighlightsSidebar({
  highlights,
  scrollToRef,
  onDelete,
  onUpdateComment,
}: HighlightsSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const sorted = [...highlights].sort(
    (a, b) => a.position.pageNumber - b.position.pageNumber
  );

  const startEdit = (h: Highlight) => {
    setEditingId(h.id);
    setDraft(h.comment?.text ?? "");
  };

  const saveEdit = (h: Highlight) => {
    onUpdateComment(h.id, { text: draft, emoji: h.comment?.emoji ?? "" });
    setEditingId(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2>Highlights</h2>
        <span className="badge">{highlights.length}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="sidebar__empty">
          Select text in the PDF to create a highlight. Hover a highlight to
          review or delete it.
        </p>
      ) : (
        <ul className="highlight-list">
          {sorted.map((h) => (
            <li
              key={h.id}
              className="highlight-item"
              onClick={() => scrollToRef.current?.(h)}
            >
              <div className="highlight-item__meta">
                <span className="page-tag">p. {h.position.pageNumber}</span>
                {h.comment?.emoji ? (
                  <span className="highlight-item__emoji">
                    {h.comment.emoji}
                  </span>
                ) : null}
                <span className="highlight-item__actions">
                  <button
                    title="Edit note"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(h);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(h.id);
                    }}
                  >
                    🗑️
                  </button>
                </span>
              </div>

              <blockquote className="highlight-item__content">
                {h.content?.text}
              </blockquote>

              {editingId === h.id ? (
                <div className="highlight-item__editor">
                  <textarea
                    value={draft}
                    autoFocus
                    placeholder="Add a note…"
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="highlight-item__editor-actions">
                    <button onClick={() => saveEdit(h)}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : h.comment?.text ? (
                <p className="highlight-item__note">{h.comment.text}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
