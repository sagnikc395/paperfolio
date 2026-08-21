use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::AppState;
use crate::error::{Error, Result};
use crate::markdown;
use crate::patch::{double_option, parts, trim, Field};

const COLUMNS: &str = "id, paper_id, title, content, created_at, updated_at";

#[derive(Debug, Serialize)]
pub struct Note {
    pub id: String,
    pub paper_id: String,
    pub title: String,
    pub content: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Note {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paper_id: row.get("paper_id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct NewNote {
    pub paper_id: String,
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NotePatch {
    #[serde(default, deserialize_with = "double_option")]
    pub title: Field<String>,
    #[serde(default, deserialize_with = "double_option")]
    pub content: Field<String>,
}

/// The paper a note belongs to, for naming its folder on disk.
fn paper_of(conn: &rusqlite::Connection, note_id: &str) -> Option<(String, String)> {
    conn.query_row(
        "SELECT p.id, p.title FROM papers p JOIN notes n ON n.paper_id = p.id WHERE n.id = ?1",
        params![note_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .ok()
}

fn paper_title(conn: &rusqlite::Connection, paper_id: &str) -> Option<String> {
    conn.query_row(
        "SELECT title FROM papers WHERE id = ?1",
        params![paper_id],
        |row| row.get(0),
    )
    .ok()
}

#[tauri::command]
pub fn list_notes(state: State<'_, AppState>, paper_id: String) -> Result<Vec<Note>> {
    let conn = state.conn();
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM notes WHERE paper_id = ?1 ORDER BY updated_at DESC"
    ))?;
    let rows = stmt.query_map(params![paper_id], Note::from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| Error::msg(format!("Failed to list notes: {e}")))
}

#[tauri::command]
pub fn create_note(state: State<'_, AppState>, data: NewNote) -> Result<Note> {
    let title = data.title.trim().to_string();
    if title.is_empty() {
        return Err(Error::msg("title is required"));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let conn = state.conn();
    conn.execute(
        "INSERT INTO notes (id, paper_id, title, content) VALUES (?1, ?2, ?3, ?4)",
        params![id, data.paper_id, title, data.content],
    )
    .map_err(|e| Error::msg(format!("Failed to create note: {e}")))?;

    let note = conn
        .query_row(
            &format!("SELECT {COLUMNS} FROM notes WHERE id = ?1"),
            params![id],
            Note::from_row,
        )
        .map_err(Error::from)?;

    if let Some(title) = paper_title(&conn, &note.paper_id) {
        markdown::write_note(
            &state,
            &title,
            &note.paper_id,
            &note.id,
            &note.title,
            note.content.as_deref(),
            &note.updated_at,
        );
    }
    Ok(note)
}

#[tauri::command]
pub fn update_note(state: State<'_, AppState>, id: String, patch: NotePatch) -> Result<Note> {
    let title = trim(patch.title);
    // `title` is NOT NULL; the body may be emptied.
    if matches!(&title, Some(None)) {
        return Err(Error::msg("title is required"));
    }
    let content = trim(patch.content);

    let (has_title, v_title) = parts(&title);
    let (has_content, v_content) = parts(&content);

    let conn = state.conn();
    conn.execute(
        "UPDATE notes SET
           title   = CASE WHEN ?1 THEN ?2 ELSE title   END,
           content = CASE WHEN ?3 THEN ?4 ELSE content END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?5",
        params![has_title, v_title, has_content, v_content, id],
    )
    .map_err(|e| Error::msg(format!("Failed to update note: {e}")))?;

    let note = conn
        .query_row(
            &format!("SELECT {COLUMNS} FROM notes WHERE id = ?1"),
            params![id],
            Note::from_row,
        )
        .map_err(|e| Error::from_query(e, "Note not found", "Failed to update note"))?;

    if let Some(title) = paper_title(&conn, &note.paper_id) {
        markdown::write_note(
            &state,
            &title,
            &note.paper_id,
            &note.id,
            &note.title,
            note.content.as_deref(),
            &note.updated_at,
        );
    }
    Ok(note)
}

#[tauri::command]
pub fn delete_note(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.conn();
    let owner = paper_of(&conn, &id);
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| Error::msg(format!("Failed to delete note: {e}")))?;

    if let Some((paper_id, title)) = owner {
        markdown::delete_note(&state, &title, &paper_id, &id);
    }
    Ok(())
}
