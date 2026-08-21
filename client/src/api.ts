import { invoke } from "@tauri-apps/api/core";
import type {
  Paper,
  Highlight,
  Note,
  Idea,
  ScaledPosition,
  Comment,
  PaperDraft,
} from "./types";

/**
 * Calls a Rust command. Tauri rejects with the string produced by the command's
 * error type, so the frontend still sees the same messages the Express API used
 * to return in `{ error: ... }` bodies.
 */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : String(err));
  }
}

type Row = Record<string, unknown>;

function mapHighlight(row: Row): Highlight {
  const position = row.position as ScaledPosition;
  return {
    id: String(row.id),
    paper_id: String(row.paper_id),
    content: { text: (row.content as string) ?? "" },
    comment: {
      text: (row.comment as string) ?? "",
      emoji: (row.emoji as string) ?? "",
    },
    position,
    page: (row.page as number | null) ?? null,
    created_at: String(row.created_at),
  };
}

export const api = {
  // Papers
  listPapers: () => call<Paper[]>("list_papers"),
  getPaper: (id: string) => call<Paper>("get_paper", { id }),
  createPaper: (data: PaperDraft) => call<Paper>("create_paper", { data }),
  updatePaper: (id: string, patch: Partial<Paper>) =>
    call<Paper>("update_paper", { id, patch }),
  /** Imports a PDF from an absolute path picked via the native file dialog. */
  setPaperPdf: (id: string, sourcePath: string) =>
    call<Paper>("set_paper_pdf", { id, sourcePath }),
  deletePaper: (id: string) => call<void>("delete_paper", { id }),
  /** Absolute on-disk path of a stored PDF, for `convertFileSrc`. */
  pdfPath: (filename: string) => call<string>("pdf_path", { filename }),

  // Highlights
  listHighlights: async (paperId: string): Promise<Highlight[]> => {
    const rows = await call<Row[]>("list_highlights", { paperId });
    return rows.map(mapHighlight);
  },
  createHighlight: async (data: {
    paper_id: string;
    content: string;
    comment: Comment;
    position: ScaledPosition;
  }): Promise<Highlight> => {
    const row = await call<Row>("create_highlight", {
      data: {
        paper_id: data.paper_id,
        content: data.content,
        comment: data.comment.text || null,
        emoji: data.comment.emoji || null,
        position: data.position,
        page: data.position.pageNumber ?? null,
      },
    });
    return mapHighlight(row);
  },
  updateHighlight: async (
    id: string,
    patch: { comment: Comment }
  ): Promise<Highlight> => {
    const row = await call<Row>("update_highlight", {
      id,
      patch: {
        comment: patch.comment.text || null,
        emoji: patch.comment.emoji || null,
        content: null,
      },
    });
    return mapHighlight(row);
  },
  deleteHighlight: (id: string) => call<void>("delete_highlight", { id }),

  // Notes
  listNotes: (paperId: string) => call<Note[]>("list_notes", { paperId }),
  createNote: (data: { paper_id: string; title: string; content?: string }) =>
    call<Note>("create_note", {
      data: { paper_id: data.paper_id, title: data.title, content: data.content ?? null },
    }),
  updateNote: (id: string, patch: { title?: string; content?: string }) =>
    call<Note>("update_note", { id, patch }),
  deleteNote: (id: string) => call<void>("delete_note", { id }),

  // Ideas
  listIdeas: (paperId: string) => call<Idea[]>("list_ideas", { paperId }),
  createIdea: (data: { paper_id: string; content: string }) =>
    call<Idea>("create_idea", { data }),
  deleteIdea: (id: string) => call<void>("delete_idea", { id }),
};
