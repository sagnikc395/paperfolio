# Paperfolio

A macOS app for reading research papers and keeping what you learn from them.

You import a PDF, read it in the app, highlight as you go, and write notes
alongside it. Everything about one paper — the PDF, its highlights, its notes,
the loose ideas it sparked — stays together in that paper's own space, and all of
it lives on your Mac in a folder you can open, copy and back up yourself.

## What it does

Add a paper with whatever metadata you have (title, authors, year, venue, URL,
abstract) and mark it unread, reading or read. All of it stays editable later.

Select text in the PDF to highlight it, with an optional note and emoji marker.
The sidebar lists every highlight by page; click one to jump back to it.

Notes are markdown, written in a CodeMirror editor. SQLite is the source of
truth, but each note is also mirrored to a plain `.md` file so your writing stays
readable outside the app and travels with the same folder copy that backs up
everything else. Ideas are the lighter-weight version: one line, captured fast,
kept in a list per paper.

## Running it

You need macOS 10.15+, [Node](https://nodejs.org) 20.19+, [Rust](https://rustup.rs)
(stable) and the Xcode command line tools (`xcode-select --install`).

```bash
npm install
npm run dev      # hot-reloads the UI, rebuilds Rust on change
```

There's no server and no database to start — the app creates its SQLite file on
first launch.

```bash
npm run build    # → paperfolio/target/release/bundle/{macos,dmg}/
```

The build is unsigned, so the first launch needs a right-click → Open to get past
Gatekeeper. Distributing it beyond your own machine would need an Apple Developer
ID and notarization.

Also: `npm run typecheck` for the frontend, `npm run dev:client` to run the Vite
server on its own and poke at the UI in a browser.

## Your data

One visible folder, in Documents:

```
~/Documents/Paperfolio_Data/
├── paperfolio.db      # SQLite, WAL mode
├── uploads/           # imported PDFs
└── notes/             # markdown mirror, one folder per paper
```

That folder is the whole library — copy it to back up, copy it onto another Mac
to move. Quit the app first so SQLite checkpoints its write-ahead log. Delete it
and you're back to an empty library.

Libraries from earlier builds lived in `~/Library/Application Support/com.paperfolio.app`.
If one is there and `Paperfolio_Data` isn't, the app copies it over on first
launch (via `VACUUM INTO`, so no recent writes are lost) and leaves the original
alone.

## How it's put together

Tauri v2: a Rust core behind a WKWebView running React 18 + TypeScript, built by
Vite. The UI never speaks HTTP — every data operation is a Tauri command invoked
over IPC (`list_papers`, `create_highlight`, `update_note`, …), and PDFs reach the
webview through Tauri's asset protocol scoped to the uploads directory.

```
├── paperfolio/              # Rust core
│   ├── tauri.conf.json      # window, CSP, bundle config
│   ├── capabilities/        # IPC permissions
│   └── src/
│       ├── lib.rs           # command registration, app setup
│       ├── db.rs            # schema, connection state, data dir
│       ├── markdown.rs      # note → .md mirroring
│       ├── patch.rs         # partial-update helpers
│       ├── error.rs
│       └── papers.rs, highlights.rs, notes.rs, ideas.rs
└── client/src/
    ├── pages/               # WelcomePage, LibraryPage, PaperPage
    ├── components/          # PdfViewer, HighlightsSidebar, NotesPanel,
    │                        # IdeasPanel, MarkdownEditor, PaperFormModal, …
    ├── api.ts               # Tauri IPC wrapper
    └── dialogs.ts           # native open/confirm panels
```

## License

MIT.
