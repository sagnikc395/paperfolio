import { useState } from "react";
import type { Idea } from "../types";

interface IdeasPanelProps {
  ideas: Idea[];
  onCreate: (content: string) => void;
  onDelete: (id: string) => void;
}

export function IdeasPanel({ ideas, onCreate, onDelete }: IdeasPanelProps) {
  const [content, setContent] = useState("");

  const submit = () => {
    if (!content.trim()) return;
    onCreate(content.trim());
    setContent("");
  };

  return (
    <div className="panel">
      <div className="panel__composer panel__composer--row">
        <input
          placeholder="Capture an idea… e.g. Could apply this method to X"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button className="btn btn--primary" onClick={submit}>
          Add idea
        </button>
      </div>

      {ideas.length === 0 ? (
        <p className="panel__empty">No ideas captured yet.</p>
      ) : (
        <ul className="idea-list">
          {ideas.map((idea) => (
            <li key={idea.id} className="idea-item">
              <span className="idea-item__text">{idea.content}</span>
              <span className="idea-item__meta">
                <time>{new Date(idea.created_at).toLocaleString()}</time>
                <button
                  title="Delete"
                  onClick={() => onDelete(idea.id)}
                >
                  🗑️
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
