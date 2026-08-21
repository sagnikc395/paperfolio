use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;

/// Schema, translated from the original Postgres `db/init.sql`.
///
/// Differences forced by SQLite: UUID primary keys become TEXT (generated in
/// Rust rather than by `gen_random_uuid()`), `TIMESTAMPTZ ... DEFAULT now()`
/// becomes an ISO-8601 TEXT default, and the `position` JSONB column becomes
/// TEXT holding the same JSON.
const SCHEMA: &str = r#"
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS papers (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  authors     TEXT,
  abstract    TEXT,
  year        INTEGER,
  venue       TEXT,
  url         TEXT,
  pdf_path    TEXT,
  status      TEXT NOT NULL DEFAULT 'unread', -- unread | reading | read
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS highlights (
  id          TEXT PRIMARY KEY,
  paper_id    TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  comment     TEXT,
  emoji       TEXT,
  position    TEXT NOT NULL,
  page        INTEGER,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  paper_id    TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS ideas (
  id          TEXT PRIMARY KEY,
  paper_id    TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_highlights_paper ON highlights(paper_id);
CREATE INDEX IF NOT EXISTS idx_notes_paper ON notes(paper_id);
CREATE INDEX IF NOT EXISTS idx_ideas_paper ON ideas(paper_id);
"#;

/// Everything the commands need: one SQLite connection and the directory that
/// holds the imported PDFs. Both live in `~/Documents/Paperfolio_Data` so the
/// library sits somewhere visible that Time Machine, iCloud and a plain drag to
/// another Mac all pick up.
pub struct AppState {
    conn: Mutex<Connection>,
    pub data_dir: PathBuf,
    pub uploads_dir: PathBuf,
}

/// Copies a library from an older storage location into `target`, once.
///
/// Earlier builds kept everything in `~/Library/Application Support`. If that
/// library exists and the new location is still empty, bring it across. The
/// database is copied with `VACUUM INTO` rather than a file copy: it is in WAL
/// mode, so copying the `.db` alone would silently drop the most recent
/// commits. The originals are left untouched, so this is safe to get wrong.
pub fn migrate_from(legacy_dir: &Path, target: &Path) -> rusqlite::Result<bool> {
    let legacy_db = legacy_dir.join("paperfolio.db");
    let target_db = target.join("paperfolio.db");
    if !legacy_db.is_file() || target_db.exists() {
        return Ok(false);
    }

    std::fs::create_dir_all(target).ok();
    let legacy_conn = Connection::open(&legacy_db)?;
    legacy_conn.execute("VACUUM INTO ?1", [target_db.to_string_lossy().as_ref()])?;

    // Bring the PDFs across too; paths in the database are bare filenames.
    let legacy_uploads = legacy_dir.join("uploads");
    let target_uploads = target.join("uploads");
    if legacy_uploads.is_dir() {
        std::fs::create_dir_all(&target_uploads).ok();
        if let Ok(entries) = std::fs::read_dir(&legacy_uploads) {
            for entry in entries.flatten() {
                let dest = target_uploads.join(entry.file_name());
                if !dest.exists() {
                    let _ = std::fs::copy(entry.path(), dest);
                }
            }
        }
    }

    Ok(true)
}

impl AppState {
    pub fn new(data_dir: &Path) -> rusqlite::Result<Self> {
        std::fs::create_dir_all(data_dir).expect("failed to create data dir");
        let uploads_dir = data_dir.join("uploads");
        std::fs::create_dir_all(&uploads_dir).expect("failed to create uploads dir");

        let conn = Connection::open(data_dir.join("paperfolio.db"))?;
        conn.execute_batch(SCHEMA)?;

        Ok(Self {
            conn: Mutex::new(conn),
            data_dir: data_dir.to_path_buf(),
            uploads_dir,
        })
    }

    /// The connection is behind a mutex because Tauri commands run on a thread
    /// pool. A single-user desktop app never contends here in practice.
    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("sqlite mutex poisoned")
    }

    pub fn resolve_upload(&self, filename: &str) -> PathBuf {
        self.uploads_dir.join(filename)
    }
}
