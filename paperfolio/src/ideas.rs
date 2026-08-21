use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::AppState;
use crate::error::{Error, Result};

const COLUMNS: &str = "id, paper_id, content, created_at";

#[derive(Debug, Serialize)]
pub struct Idea {
    pub id: String,
    pub paper_id: String,
    pub content: String,
    pub created_at: String,
}

impl Idea {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            paper_id: row.get("paper_id")?,
            content: row.get("content")?,
            created_at: row.get("created_at")?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct NewIdea {
    pub paper_id: String,
    pub content: String,
}

#[tauri::command]
pub fn list_ideas(state: State<'_, AppState>, paper_id: String) -> Result<Vec<Idea>> {
    let conn = state.conn();
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM ideas WHERE paper_id = ?1 ORDER BY created_at DESC"
    ))?;
    let rows = stmt.query_map(params![paper_id], Idea::from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| Error::msg(format!("Failed to list ideas: {e}")))
}

#[tauri::command]
pub fn create_idea(state: State<'_, AppState>, data: NewIdea) -> Result<Idea> {
    let content = data.content.trim().to_string();
    if content.is_empty() {
        return Err(Error::msg("content is required"));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let conn = state.conn();
    conn.execute(
        "INSERT INTO ideas (id, paper_id, content) VALUES (?1, ?2, ?3)",
        params![id, data.paper_id, content],
    )
    .map_err(|e| Error::msg(format!("Failed to create idea: {e}")))?;

    conn.query_row(
        &format!("SELECT {COLUMNS} FROM ideas WHERE id = ?1"),
        params![id],
        Idea::from_row,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn delete_idea(state: State<'_, AppState>, id: String) -> Result<()> {
    let conn = state.conn();
    conn.execute("DELETE FROM ideas WHERE id = ?1", params![id])
        .map_err(|e| Error::msg(format!("Failed to delete idea: {e}")))?;
    Ok(())
}
