# Paperfolio 📚

A native macOS app for reading, highlighting and annotating research papers.
Each paper gets its own **namespace** where you keep its PDF, the highlighted
passages, and structured notes and ideas — all stored locally on your Mac.

## Stack

| Layer    | Tech                                                               |
| -------- | ------------------------------------------------------------------ |
| Shell    | Tauri v2 (Rust core + WKWebView)                                   |
| Frontend | React 18 + TypeScript, Vite, React Router, `react-pdf-highlighter` |
| Backend  | Rust commands invoked over Tauri IPC                               |
| Database | SQLite (`rusqlite`, bundled — no server, no Docker)                |

## Features

- **Paper library** — add papers with metadata (title, authors, year, venue, URL,
  abstract) and a PDF, with a reading status (unread / reading / read).
- **Per-paper namespace** — every paper has its own PDF, highlights, notes and
  ideas.
- **PDF highlighting** — select text in the rendered PDF to highlight it, add a
  note and an emoji marker. Hover any highlight to review or delete it.
- **Highlights sidebar** — every highlight listed by page; click to jump to it,
  edit its note inline.
- **Editable namespaces** — change a paper's title, authors, year, venue, URL
  and abstract at any time via **Edit details**; clearing a box clears the field.
- **Notes** — long-form, titled notes per paper, each editable and deletable.
- **Ideas** — quick-capture idea list per paper.
- **Native file dialogs** — PDFs are chosen through the macOS open panel and
  copied into the app's own storage.

## Prerequisites

- macOS 10.15+
- [Node.js](https://nodejs.org) 20.19+ (or 22.12+)
- [Rust](https://rustup.rs) (stable) — `curl https://sh.rustup.rs -sSf | sh`
- Xcode Command Line Tools — `xcode-select --install`

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Run the app in development (hot-reloads the UI, rebuilds Rust on change)
npm run dev
```

There is no database to start and no server to run — the app creates its SQLite
database on first launch.

## Building a release app

```bash
npm run build
```

This produces:

- `src-tauri/target/release/bundle/macos/Paperfolio.app`
- `src-tauri/target/release/bundle/dmg/Paperfolio_0.1.0_aarch64.dmg`

The build is unsigned. To distribute it outside your own machine you'll need an
Apple Developer ID and notarization; locally, right-click → Open the first time
to bypass Gatekeeper.

## Where your data lives

Everything sits in one visible folder in your Documents:

```
~/Documents/Paperfolio_Data/
├── paperfolio.db      # SQLite database (WAL mode)
└── uploads/           # imported PDFs, one per paper
```

**Backing up** — copy the whole `Paperfolio_Data` folder. That is the complete
library; there is no state anywhere else.

**Migrating to another Mac** — quit Paperfolio, copy `Paperfolio_Data` into the
other Mac's Documents folder, and launch the app there. Quit first so SQLite has
checkpointed its write-ahead log.

Deleting the folder resets the app to an empty library.

> Libraries created by earlier builds lived in
> `~/Library/Application Support/com.paperfolio.app`. On first launch the app
> copies such a library into `Documents/Paperfolio_Data` — using `VACUUM INTO`,
> so no recent writes are lost — and leaves the original untouched. The copy
> only happens when the Documents library does not exist yet.

## Useful scripts

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Run the macOS app in development mode         |
| `npm run build`      | Build the `.app` and `.dmg` bundles           |
| `npm run typecheck`  | Type-check the frontend                       |
| `npm run dev:client` | Run only the Vite dev server (UI in a browser)|

## Architecture

The UI never speaks HTTP. Every data operation is a Tauri command invoked over
IPC and handled in Rust:

| Command             | Replaces                       |
| ------------------- | ------------------------------ |
| `list_papers`       | `GET /api/papers`              |
| `get_paper`         | `GET /api/papers/:id`          |
| `create_paper`      | `POST /api/papers`             |
| `update_paper`      | `PATCH /api/papers/:id`        |
| `set_paper_pdf`     | `POST /api/papers/:id/pdf`     |
| `delete_paper`      | `DELETE /api/papers/:id`       |
| `pdf_path`          | `GET /uploads/:file`           |
| `list_highlights`   | `GET /api/highlights`          |
| `create_highlight`  | `POST /api/highlights`         |
| `update_highlight`  | `PATCH /api/highlights/:id`    |
| `delete_highlight`  | `DELETE /api/highlights/:id`   |
| `list_notes`        | `GET /api/notes`               |
| `create_note`       | `POST /api/notes`              |
| `update_note`       | `PATCH /api/notes/:id`         |
| `delete_note`       | `DELETE /api/notes/:id`        |
| `list_ideas`        | `GET /api/ideas`               |
| `create_idea`       | `POST /api/ideas`              |
| `delete_idea`       | `DELETE /api/ideas/:id`        |

PDFs are served to the webview through Tauri's asset protocol, scoped to the
uploads directory, rather than over a static file route.

## Project layout

```
├── src-tauri/               # Rust core
│   ├── tauri.conf.json      # window, CSP, bundle config
│   ├── capabilities/        # IPC permissions
│   └── src/
│       ├── main.rs
│       ├── lib.rs           # command registration, app setup
│       ├── db.rs            # SQLite schema + connection state
│       ├── error.rs
│       ├── papers.rs        # commands, one module per entity
│       ├── highlights.rs
│       ├── notes.rs
│       └── ideas.rs
└── client/                  # Vite + React + TS frontend
    └── src/
        ├── pages/           # LibraryPage, PaperPage
        ├── components/      # PdfViewer, HighlightsSidebar, NotesPanel, IdeasPanel
        ├── api.ts           # Tauri IPC wrapper
        ├── dialogs.ts       # native open/confirm panels
        └── types.ts
```
