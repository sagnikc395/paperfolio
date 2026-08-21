use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::AppState;
use crate::error::{Error, Result};

const COLUMNS: &str = "id, paper_id, content, comment, emoji, position, page, created_at";

#[derive(Debug, Serialize)]
pub struct Highlight {
    pub id: String,
    pub paper_id: String,
    pub content: String,
    pub comment: Option<String>,
    pub emoji: Option<String>,
    /// Stored as TEXT in SQLite but handed back to the frontend as real JSON,
    /// so it behaves exactly like the old Postgres JSONB column.
    pub position: serde_json::Value,
    pub page: Option<i64>,
    pub created_at: String,
}

impl Highlight {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let position: String = row.get("position")?;
        Ok(Self {
            id: row.get("id")?,
            paper_id: row.get("paper_id")?,
            content: row.get("content")?,
            comment: row.get("comment")?,
            emoji: row.get("emoji")?,
            position: serde_json::from_str(&position).unwrap_or(serde_json::Value::Null),
            page: row.get("page")?,
            created_at: row.get("created_at")?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct NewHighlight {
    pub paper_id: String,
    pub content: String,
    pub comment: Option<String>,
    pub emoji: Option<String>,
    pub position: serde_json::Value,
    pub page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct HighlightPatch {
    pub comment: Option<String>,
    pub content: Option<String>,
    pub emoji: Option<String>,
}

#[tauri::command]
pub fn list_highlights(state: State<'_, AppState>, paper_id: String) -> Result<Vec<Highlight>> {
    let conn = state.conn();
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM highlights WHERE paper_id = ?1 ORDER BY created_at ASC"
    ))?;
    let rows = stmt.query_map(params![paper_id], Highlight::from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| Error::msg(format!("Failed to list highlights: {e}")))
}

#[tauri::command]
pub fn create_highlight(state: State<'_, AppState>, data: NewHighlight) -> Result<Highlight> {
    if data.content.is_empty() || data.position.is_null() {
        return Err(Error::msg("content and position are required"));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let conn = state.conn();
    conn.execute(
        "INSERT INTO highlights (id, paper_id, content, comment, emoji, position, page)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            data.paper_id,
            data.content,
            data.comment,
            data.emoji,
            serde_json::to_string(&data.position)?,
            data.page,
        ],
    )
    .map_err(|e| Error::msg(format!("Failed to create highlight: {e}")))?;

    conn.query_row(
        &format!("SELECT {COLUMNS} FROM highlights WHERE id = ?1"),
        params![id],
        Highlight::from_row,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn update_highlight(
    state: State<'_, AppState>,
    id: String,
    patch: HighlightPatch,
) -> Result<Highlight> {
    let conn = state.conn();
    conn.execute(
        "UPDATE highlights SET
           comment = COALESCE(?1, comment),
           content = COALESCE(?2, content),
           emoji = COALESCE(?3, emoji)
         WHERE id = ?4",
        params![patch.comment, patch.content, patch.emoji, id],
    )
    .map_err(|e| Error::msg(format!("Failed to update highlight: {e}")))?;

    conn.query_row(
        &format!("SELECT {COLUMNS} FROM highlights WHERE id = ?1"),
        params![id],
        Highlight::from_row,
    )
    .map_err(|e| Error::from_query(e, "Highlight not found", "Failed to update highlight"))
}

#[tauri::command]
pub fn delete_highlight(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.conn();
    conn.execute("DELETE FROM highlights WHERE id = ?1", params![id])
        .map_err(|e| Error::msg(format!("Failed to delete highlight: {e}")))?;
    Ok(())
}
