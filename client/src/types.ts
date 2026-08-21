import type {
  IHighlight,
  ScaledPosition,
  Content,
  Comment,
} from "react-pdf-highlighter";

export type { ScaledPosition, Content, Comment };

export type PaperStatus = "unread" | "reading" | "read";

export interface Paper {
  id: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  year: number | null;
  venue: string | null;
  url: string | null;
  pdf_path: string | null;
  status: PaperStatus;
  created_at: string;
  updated_at: string;
  highlight_count?: number;
  note_count?: number;
  idea_count?: number;
}

export interface Highlight extends IHighlight {
  paper_id: string;
  page: number | null;
  created_at: string;
}

export interface Note {
  id: string;
  paper_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  paper_id: string;
  content: string;
  created_at: string;
}

/** Payload for creating a paper, mirroring the Rust `NewPaper` struct. */
export interface PaperDraft {
  title: string;
  authors?: string | null;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  url?: string | null;
  /** Absolute path to a PDF chosen via the native file dialog. */
  pdf_source_path?: string | null;
}
