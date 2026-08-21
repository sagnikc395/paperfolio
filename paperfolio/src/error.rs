use serde::{Serialize, Serializer};

/// Command errors. These reach the frontend as plain strings, so the messages
/// are the same user-facing text the Express handlers used to return in
/// `{ "error": ... }` bodies.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Message(String),

    #[error("{0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("{0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Json(#[from] serde_json::Error),
}

impl Error {
    pub fn msg(text: impl Into<String>) -> Self {
        Self::Message(text.into())
    }

    /// Maps a `QueryReturnedNoRows` into a friendly "not found" message and
    /// anything else into the given failure text, mirroring the old
    /// 404-vs-500 split in the Express routes.
    pub fn from_query(err: rusqlite::Error, not_found: &str, failed: &str) -> Self {
        match err {
            rusqlite::Error::QueryReturnedNoRows => Self::msg(not_found),
            _ => Self::msg(format!("{failed}: {err}")),
        }
    }
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
