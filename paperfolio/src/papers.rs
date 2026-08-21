use std::path::Path;

use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::AppState;
use crate::error::{Error, Result};
use crate::markdown;
use crate::patch::{double_option, parts, trim, Field};

const COLUMNS: &str =
    "id, title, authors, abstract, year, venue, url, pdf_path, status, created_at, updated_at";

#[derive(Debug, Serialize)]
pub struct Paper {
    pub id: String,
    pub title: String,
    pub authors: Option<String>,
    // `abstract` is a Rust keyword, so it is renamed on the wire to keep the
    // frontend `Paper` type unchanged.
    #[serde(rename = "abstract")]
    pub abstract_: Option<String>,
    pub year: Option<i64>,
    pub venue: Option<String>,
    pub url: Option<String>,
    pub pdf_path: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlight_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idea_count: Option<i64>,
}

impl Paper {
    fn from_row(row: &Row, with_counts: bool) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            authors: row.get("authors")?,
            abstract_: row.get("abstract")?,
            year: row.get("year")?,
            venue: row.get("venue")?,
            url: row.get("url")?,
            pdf_path: row.get("pdf_path")?,
            status: row.get("status")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            highlight_count: with_counts.then(|| row.get("highlight_count")).transpose()?,
            note_count: with_counts.then(|| row.get("note_count")).transpose()?,
            idea_count: with_counts.then(|| row.get("idea_count")).transpose()?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct NewPaper {
    pub title: String,
    pub authors: Option<String>,
    #[serde(rename = "abstract")]
    pub abstract_: Option<String>,
    pub year: Option<i64>,
    pub venue: Option<String>,
    pub url: Option<String>,
    /// Absolute path to a PDF chosen through the native file dialog.
    pub pdf_source_path: Option<String>,
}

/// Every metadata field is a three-state patch field so the edit form can
/// clear one. `status` is never cleared, so it stays a plain option.
#[derive(Debug, Deserialize)]
pub struct PaperPatch {
    #[serde(default, deserialize_with = "double_option")]
    pub title: Field<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub authors: Field<String>,
    #[serde(rename = "abstract", default, deserialize_with = "double_option")]
    pub abstract_: Field<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub year: Field<i64>,
    #[serde(default, deserialize_with = "double_option")]
    pub venue: Field<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub url: Field<String>,
    pub status: Option<String>,
}

fn trimmed(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

/// Copies a user-chosen PDF into the app's uploads directory under a fresh
/// UUID filename. Replaces what multer's disk storage did.
fn import_pdf(state: &AppState, source: &str) -> Result<String> {
    let source = Path::new(source);
    if !source.is_file() {
        return Err(Error::msg("Selected file does not exist"));
    }
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_else(|| "pdf".into());
    if ext != "pdf" {
        return Err(Error::msg("Only PDF files are allowed"));
    }
    let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    std::fs::copy(source, state.resolve_upload(&filename))?;
    Ok(filename)
}

fn remove_pdf(state: &AppState, filename: Option<String>) {
    if let Some(name) = filename {
        let _ = std::fs::remove_file(state.resolve_upload(&name));
    }
}

#[tauri::command]
pub fn list_papers(state: State<'_, AppState>) -> Result<Vec<Paper>> {
    let conn = state.conn();
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS},
           (SELECT count(*) FROM highlights h WHERE h.paper_id = p.id) AS highlight_count,
           (SELECT count(*) FROM notes n WHERE n.paper_id = p.id) AS note_count,
           (SELECT count(*) FROM ideas i WHERE i.paper_id = p.id) AS idea_count
         FROM papers p
         ORDER BY p.created_at DESC"
    ))?;
    let rows = stmt.query_map([], |row| Paper::from_row(row, true))?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| Error::msg(format!("Failed to list papers: {e}")))
}

#[tauri::command]
pub fn get_paper(state: State<'_, AppState>, id: String) -> Result<Paper> {
    let conn = state.conn();
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM papers WHERE id = ?1"),
        params![id],
        |row| Paper::from_row(row, false),
    )
    .map_err(|e| Error::from_query(e, "Paper not found", "Failed to load paper"))
}

#[tauri::command]
pub fn create_paper(state: State<'_, AppState>, data: NewPaper) -> Result<Paper> {
    let title = data.title.trim().to_string();
    if title.is_empty() {
        return Err(Error::msg("Title is required"));
    }

    let pdf_path = match data.pdf_source_path.as_deref() {
        Some(path) => Some(import_pdf(&state, path)?),
        None => None,
    };

    let id = uuid::Uuid::new_v4().to_string();
    let conn = state.conn();
    conn.execute(
        "INSERT INTO papers (id, title, authors, abstract, year, venue, url, pdf_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            title,
            trimmed(data.authors),
            trimmed(data.abstract_),
            data.year,
            trimmed(data.venue),
            trimmed(data.url),
            pdf_path,
        ],
    )
    .map_err(|e| Error::msg(format!("Failed to create paper: {e}")))?;

    conn.query_row(
        &format!("SELECT {COLUMNS} FROM papers WHERE id = ?1"),
        params![id],
        |row| Paper::from_row(row, false),
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn update_paper(state: State<'_, AppState>, id: String, patch: PaperPatch) -> Result<Paper> {
    let title = trim(patch.title);
    // `title` is NOT NULL, so an empty one is rejected rather than written.
    if matches!(&title, Some(None)) {
        return Err(Error::msg("Title is required"));
    }

    let authors = trim(patch.authors);
    let abstract_ = trim(patch.abstract_);
    let venue = trim(patch.venue);
    let url = trim(patch.url);

    let (has_title, v_title) = parts(&title);
    let (has_authors, v_authors) = parts(&authors);
    let (has_abstract, v_abstract) = parts(&abstract_);
    let (has_year, v_year) = parts(&patch.year);
    let (has_venue, v_venue) = parts(&venue);
    let (has_url, v_url) = parts(&url);

    let conn = state.conn();
    // Captured before the write so the notes folder can follow a retitle.
    let previous_title: Option<String> = conn
        .query_row(
            "SELECT title FROM papers WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .ok();

    // CASE WHEN <provided> keeps omitted fields untouched while still allowing
    // a provided NULL to clear one.
    conn.execute(
        "UPDATE papers SET
           title    = CASE WHEN ?1  THEN ?2  ELSE title    END,
           authors  = CASE WHEN ?3  THEN ?4  ELSE authors  END,
           abstract = CASE WHEN ?5  THEN ?6  ELSE abstract END,
           year     = CASE WHEN ?7  THEN ?8  ELSE year     END,
           venue    = CASE WHEN ?9  THEN ?10 ELSE venue    END,
           url      = CASE WHEN ?11 THEN ?12 ELSE url      END,
           status   = COALESCE(?13, status),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?14",
        params![
            has_title,
            v_title,
            has_authors,
            v_authors,
            has_abstract,
            v_abstract,
            has_year,
            v_year,
            has_venue,
            v_venue,
            has_url,
            v_url,
            patch.status,
            id,
        ],
    )
    .map_err(|e| Error::msg(format!("Failed to update paper: {e}")))?;

    let paper = conn
        .query_row(
            &format!("SELECT {COLUMNS} FROM papers WHERE id = ?1"),
            params![id],
            |row| Paper::from_row(row, false),
        )
        .map_err(|e| Error::from_query(e, "Paper not found", "Failed to update paper"))?;
    drop(conn);

    if let Some(old) = previous_title {
        if old != paper.title {
            markdown::rename_paper_dir(&state, &old, &paper.title, &id);
        }
    }
    Ok(paper)
}

/// Imports (or replaces) the paper's PDF from an absolute path on disk.
#[tauri::command]
pub fn set_paper_pdf(state: State<'_, AppState>, id: String, source_path: String) -> Result<Paper> {
    let existing: Option<String> = {
        let conn = state.conn();
        conn.query_row(
            "SELECT pdf_path FROM papers WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| Error::from_query(e, "Paper not found", "Failed to upload PDF"))?
    };

    let filename = import_pdf(&state, &source_path)?;

    let conn = state.conn();
    conn.execute(
        "UPDATE papers SET pdf_path = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?2",
        params![filename, id],
    )
    .map_err(|e| Error::msg(format!("Failed to upload PDF: {e}")))?;
    drop(conn);

    // Only discard the old file once the new one is committed.
    remove_pdf(&state, existing);

    let conn = state.conn();
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM papers WHERE id = ?1"),
        params![id],
        |row| Paper::from_row(row, false),
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn delete_paper(state: State<'_, AppState>, id: String) -> Result<()> {
    let (existing, title): (Option<String>, String) = {
        let conn = state.conn();
        conn.query_row(
            "SELECT pdf_path, title FROM papers WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| Error::from_query(e, "Paper not found", "Failed to delete paper"))?
    };

    {
        let conn = state.conn();
        // Highlights, notes and ideas go with it via ON DELETE CASCADE.
        conn.execute("DELETE FROM papers WHERE id = ?1", params![id])
            .map_err(|e| Error::msg(format!("Failed to delete paper: {e}")))?;
    }

    remove_pdf(&state, existing);
    markdown::remove_paper_dir(&state, &title, &id);
    Ok(())
}

/// Absolute path of a paper's PDF, for the frontend to hand to `convertFileSrc`.
#[tauri::command]
pub fn pdf_path(state: State<'_, AppState>, filename: String) -> Result<String> {
    Ok(state.resolve_upload(&filename).to_string_lossy().into_owned())
}
