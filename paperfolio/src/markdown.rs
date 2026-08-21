use std::path::{Path, PathBuf};

use crate::db::AppState;

/// Notes are the source of truth in SQLite, but each one is also mirrored to a
/// plain `.md` file under `Paperfolio_Data/notes/<paper>/`. The database keeps
/// the app fast and relational; the files make the writing portable — readable
/// in any editor, diffable, and carried along by the same folder copy that
/// backs up everything else.
///
/// The mirror is best-effort: a failure to write a file never fails the note.

/// Filesystem-safe slug: lowercase, words joined by hyphens, ASCII only.
pub fn slug(text: &str) -> String {
    let mut out = String::new();
    let mut pending_dash = false;
    for ch in text.chars() {
        if ch.is_ascii_alphanumeric() {
            if pending_dash && !out.is_empty() {
                out.push('-');
            }
            pending_dash = false;
            out.extend(ch.to_lowercase());
        } else {
            pending_dash = true;
        }
        if out.len() >= 60 {
            break;
        }
    }
    if out.is_empty() {
        out.push_str("untitled");
    }
    out
}

/// `<title-slug>-<first 8 of id>` — readable, and unique even when two papers
/// or notes share a title.
fn stamped(title: &str, id: &str) -> String {
    let short: String = id.chars().filter(|c| c.is_ascii_alphanumeric()).take(8).collect();
    format!("{}-{}", slug(title), short)
}

fn notes_root(state: &AppState) -> PathBuf {
    state.data_dir.join("notes")
}

pub fn paper_dir(state: &AppState, paper_title: &str, paper_id: &str) -> PathBuf {
    notes_root(state).join(stamped(paper_title, paper_id))
}

fn note_file(dir: &Path, note_title: &str, note_id: &str) -> PathBuf {
    dir.join(format!("{}.md", stamped(note_title, note_id)))
}

/// Writes (or rewrites) a note's file, removing any file left over from an
/// earlier title. Front matter keeps the file self-describing.
pub fn write_note(
    state: &AppState,
    paper_title: &str,
    paper_id: &str,
    note_id: &str,
    note_title: &str,
    content: Option<&str>,
    updated_at: &str,
) {
    let dir = paper_dir(state, paper_title, paper_id);
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }

    let target = note_file(&dir, note_title, note_id);
    remove_other_files_for(&dir, note_id, Some(&target));

    let body = format!(
        "---\ntitle: {}\npaper: {}\nid: {}\nupdated: {}\n---\n\n{}\n",
        note_title,
        paper_title,
        note_id,
        updated_at,
        content.unwrap_or_default().trim_end()
    );
    let _ = std::fs::write(target, body);
}

/// Deletes every file belonging to a note, whatever it was last titled.
pub fn delete_note(state: &AppState, paper_title: &str, paper_id: &str, note_id: &str) {
    let dir = paper_dir(state, paper_title, paper_id);
    remove_other_files_for(&dir, note_id, None);
    // Drop the folder once its last note is gone.
    let _ = std::fs::remove_dir(&dir);
}

/// Removes files whose name carries this note's id, except `keep`.
fn remove_other_files_for(dir: &Path, note_id: &str, keep: Option<&Path>) {
    let short: String = note_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(8)
        .collect();
    let suffix = format!("-{short}.md");
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if Some(path.as_path()) == keep {
                continue;
            }
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.ends_with(&suffix))
            {
                let _ = std::fs::remove_file(path);
            }
        }
    }
}

/// Follows a paper's folder when its title changes, so the notes on disk keep
/// matching the paper they belong to.
pub fn rename_paper_dir(state: &AppState, old_title: &str, new_title: &str, paper_id: &str) {
    let from = paper_dir(state, old_title, paper_id);
    let to = paper_dir(state, new_title, paper_id);
    if from != to && from.is_dir() && !to.exists() {
        let _ = std::fs::rename(from, to);
    }
}

/// Removes a paper's whole notes folder, used when the paper is deleted.
pub fn remove_paper_dir(state: &AppState, paper_title: &str, paper_id: &str) {
    let _ = std::fs::remove_dir_all(paper_dir(state, paper_title, paper_id));
}
