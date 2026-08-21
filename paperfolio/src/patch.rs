use serde::{Deserialize, Deserializer};

/// A patch field with three states, needed by any real edit form:
///
/// - absent from the payload  -> `None`        -> leave the column alone
/// - present but `null`       -> `Some(None)`  -> clear the column
/// - present with a value     -> `Some(Some)`  -> set the column
///
/// Plain `Option<T>` collapses the first two, which is why a `COALESCE`-based
/// update can set a field but never clear one.
pub type Field<T> = Option<Option<T>>;

pub fn double_option<'de, T, D>(deserializer: D) -> Result<Field<T>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

/// Splits a field into the (`provided`, `value`) pair that the
/// `CASE WHEN ?provided THEN ?value ELSE column END` updates bind to.
pub fn parts<T>(field: &Field<T>) -> (bool, Option<&T>) {
    match field {
        Some(value) => (true, value.as_ref()),
        None => (false, None),
    }
}

/// Treats blank input as "clear this field", so an emptied form box does what
/// it looks like it does.
pub fn blank_is_null(field: Field<String>) -> Field<String> {
    field.map(|value| value.filter(|text| !text.trim().is_empty()))
}

/// Trims a provided value, leaving absent fields absent.
pub fn trim(field: Field<String>) -> Field<String> {
    blank_is_null(field).map(|value| value.map(|text| text.trim().to_string()))
}
