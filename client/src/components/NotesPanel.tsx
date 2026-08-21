import { useState } from "react";
import { confirmDestructive } from "../dialogs";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownView } from "./MarkdownView";
import type { Note } from "../types";

interface NotesPanelProps {
  notes: Note[];
  onCreate: (data: { title: string; content: string }) => void;
  onUpdate: (id: string, data: { title: string; content: string }) => void;
  onDelete: (id: string) => void;
}

export function NotesPanel({
  notes,
  onCreate,
  onUpdate,
  onDelete,
}: NotesPanelProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const submitNew = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), content: content.trim() });
    setTitle("");
    setContent("");
  };

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditContent(n.content ?? "");
  };

  const submitEdit = (id: string) => {
    if (!editTitle.trim()) return;
    onUpdate(id, { title: editTitle.trim(), content: editContent.trim() });
    setEditingId(null);
  };

  const confirmDelete = async (note: Note) => {
    const ok = await confirmDestructive(
      "This note will be deleted permanently, along with its markdown file.",
      note.title
    );
    if (ok) onDelete(note.id);
  };

  return (
    <div className="panel">
      <div className="panel__composer">
        <input
          className="panel__title-input"
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <MarkdownEditor value={content} onChange={setContent} />
        <button
          className="btn btn--primary panel__composer-submit"
          onClick={submitNew}
          disabled={!title.trim()}
        >
          Add note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="panel__empty">No notes yet.</p>
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              {editingId === n.id ? (
                <div className="note-item__editor">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <MarkdownEditor value={editContent} onChange={setEditContent} />
                  <div className="note-item__actions">
                    <button
                      className="btn btn--primary"
                      onClick={() => submitEdit(n.id)}
                    >
                      Save
                    </button>
                    <button className="btn" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-item__header">
                    <h3>{n.title}</h3>
                    <span className="note-item__actions">
                      <button className="link-btn" onClick={() => startEdit(n)}>
                        Edit
                      </button>
                      <button
                        className="link-btn link-btn--danger"
                        onClick={() => confirmDelete(n)}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  {n.content ? <MarkdownView source={n.content} /> : null}
                  <time className="note-item__time">
                    {new Date(n.updated_at).toLocaleString()}
                  </time>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
