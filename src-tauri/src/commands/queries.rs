//! Query schema for SimpleQuery request.
//!
//! # SECURITY WARNING - SQL INJECTION PREVENTION
//!
//! **ALL** column names and aliases in this schema MUST be validated against
//! the database whitelist (the `columns` metadata table) BEFORE being used
//! in SQL queries. This validation is performed in `report::run_report()`.
//!
//! The values in this schema are user-provided and potentially malicious.
//! Never directly interpolate these fields into SQL without validation:
//! - `SimpleQuery.display_columns[]` - column names
//! - `SimpleQuery.group_by[]` - column names
//! - `Calculation.column` - column name
//! - `Calculation.alias` - alias name
//! - `SimpleFilter.column` - column name
//! - `SortColumn.column` - column name
//!
//! Only filter values (`SimpleFilter.value`) are safe for parameterized queries.

use serde::{Deserialize, Serialize};
use rusqlite::types::{ToSql, ToSqlOutput};
use chrono::{NaiveDate, Datelike, Duration};

/// Represents a filter value that can be bound to SQL as either text or numeric.
/// This ensures proper type handling for INTEGER/REAL columns.
#[derive(Debug, Clone)]
pub enum FilterValue {
    Text(String),
    Integer(i64),
    Real(f64),
}

/// Attempts to parse a date string in various formats and convert to YYYYMMDD integer.
/// Supports formats like:
/// - YYYY-MM-DD (2026-03-06)
/// - YYYY/MM/DD (2026/03/06)
/// - MM/DD/YYYY (03/06/2026)
/// - DD/MM/YYYY (06/03/2026)
/// - DD-MM-YYYY (06-03-2026)
/// - Month D, YYYY (March 6, 2026)
/// - Mon D, YYYY (Mar 6, 2026)
fn parse_date_to_yyyymmdd(value: &str) -> Option<i64> {
    let value = value.trim();

    // First, try direct YYYYMMDD integer
    if let Ok(n) = value.parse::<i64>() {
        if value.len() == 8 && n > 19000101 && n < 21000101 {
            return Some(n);
        }
    }

    // Try various date formats
    let formats = [
        "%Y-%m-%d",  // 2026-03-06
        "%Y/%m/%d",  // 2026/03/06
        "%m/%d/%Y",  // 03/06/2026
        "%d/%m/%Y",  // 06/03/2026
        "%d-%m-%Y",  // 06-03-2026
        "%B %d, %Y", // March 6, 2026
        "%b %d, %Y", // Mar 6, 2026
        "%d %B %Y",  // 6 March 2026
        "%d %b %Y",  // 6 Mar 2026
    ];

    for fmt in formats {
        if let Ok(date) = NaiveDate::parse_from_str(value, fmt) {
            let yyyymmdd = date.year() as i64 * 10000 + date.month() as i64 * 100 + date.day() as i64;
            return Some(yyyymmdd);
        }
    }

    None
}

/// Check if a number looks like an Excel serial date.
/// Excel serial dates are typically in the range 1-100000, representing dates from 1900 to ~2173.
fn looks_like_excel_serial_date(n: i64) -> bool {
    n >= 1 && n < 100000
}

/// Convert YYYYMMDD integer to Excel serial date.
/// Excel epoch is January 1, 1900 (serial 1), with the leap year bug (1900 treated as leap year).
fn yyyymmdd_to_excel_serial(yyyymmdd: i64) -> Option<i64> {
    if yyyymmdd < 19000101 || yyyymmdd > 21000101 {
        return None;
    }

    let year = (yyyymmdd / 10000) as i32;
    let month = ((yyyymmdd / 100) % 100) as u32;
    let day = (yyyymmdd % 100) as u32;

    if let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
        if let Some(excel_epoch) = NaiveDate::from_ymd_opt(1900, 1, 1) {
            let days_since_epoch = date.signed_duration_since(excel_epoch).num_days();
            // Add 2 days for Excel's leap year bug (1900 was not a leap year)
            return Some(days_since_epoch + 2);
        }
    }

    None
}

/// Convert Excel serial date to YYYYMMDD integer.
fn excel_serial_to_yyyymmdd(excel_serial: i64) -> Option<i64> {
    if excel_serial < 1 || excel_serial >= 100000 {
        return None;
    }

    if let Some(excel_epoch) = NaiveDate::from_ymd_opt(1900, 1, 1) {
        // Subtract 2 days for Excel's leap year bug
        let adjusted_serial = excel_serial - 2;
        if let Some(date) = excel_epoch.checked_add_signed(Duration::days(adjusted_serial)) {
            let y = date.year();
            let m = date.month();
            let d = date.day();
            return Some(y as i64 * 10000 + m as i64 * 100 + d as i64);
        }
    }

    None
}

impl ToSql for FilterValue {
    fn to_sql(&self) -> Result<ToSqlOutput<'_>, rusqlite::Error> {
        match self {
            FilterValue::Text(s) => s.to_sql(),
            FilterValue::Integer(n) => n.to_sql(),
            FilterValue::Real(f) => f.to_sql(),
        }
    }
}

impl From<String> for FilterValue {
    fn from(s: String) -> Self {
        FilterValue::Text(s)
    }
}

impl From<&str> for FilterValue {
    fn from(s: &str) -> Self {
        FilterValue::Text(s.to_string())
    }
}

/// User-provided query configuration.
///
/// All fields contain user input that must be validated against the database
/// whitelist before use in SQL construction. See module-level docs for details.
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimpleQuery {
    pub dataset_id: i64,
    pub display_columns: Vec<String>,
    pub group_by: Vec<String>,
    pub calculations: Vec<Calculation>,
    pub filters: Vec<SimpleFilter>,
    pub sort_by: Vec<SortColumn>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Calculation {
    pub function: String, // "sum", "count", "avg", "min", "max"
    pub column: String,
    pub alias: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SimpleFilter {
    pub column: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SortColumn {
    pub column: String,
    pub descending: bool,
}

// Map simple function names to SQL
impl Calculation {
    pub fn to_sql_function(&self) -> String {
        match self.function.to_lowercase().as_str() {
            "sum" => "SUM",
            "count" => "COUNT",
            "avg" => "AVG",
            "min" => "MIN",
            "max" => "MAX",
            _ => "SUM",
        }
        .to_string()
    }
}

// Map simple operators to SQL (case-insensitive matching)
impl SimpleFilter {
    pub fn to_sql_operator(&self) -> &'static str {
        let op = self.operator.to_lowercase();
        match op.as_str() {
            "is" => "=",
            "is not" => "!=",
            "contains" => "LIKE",
            "starts with" => "LIKE",
            "ends with" => "LIKE",
            "equals" => "=",
            "not equal" => "!=",
            "greater than" => ">",
            "less than" => "<",
            "before" => "<",
            "after" => ">",
            _ => "=",
        }
    }

    /// Legacy method - returns string value with wildcards for LIKE operators.
    /// Use `to_filter_value` for proper type handling.
    pub fn transform_value(&self) -> String {
        match self.operator.as_str() {
            "contains" => format!("%{}%", self.value),
            "starts with" => format!("{}%", self.value),
            "ends with" => format!("%{}", self.value),
            _ => self.value.clone(),
        }
    }

    /// Converts the filter value to a properly-typed FilterValue based on column type.
    /// For INTEGER columns, attempts to parse as i64.
    /// For REAL columns, attempts to parse as f64.
    /// For TEXT columns or parsing failures, returns as Text with wildcards for LIKE operators.
    ///
    /// Smart date parsing: If column name contains "date"/"time"/"data"/"fecha" or value looks like YYYYMMDD,
    /// attempts to parse various date formats and convert to the appropriate format.
    ///
    /// For dates in 2025+, converts to Excel serial format to match old imported data.
    /// New imports (after this fix) will use YYYYMMDD format.
    pub fn to_filter_value(&self, column_type: &str) -> FilterValue {
        let col_type_upper = column_type.to_uppercase();
        let column_lower = self.column.to_lowercase();
        // Supports: date, time, data (PT), fecha (ES), datum (DE), datum (NL)
        let is_date_column = column_lower.contains("date") || column_lower.contains("time") ||
            column_lower == "data" || column_lower.contains("fecha");

        // Check if value looks like a YYYYMMDD date (8 digits, valid range)
        let value_looks_like_yyyymmdd = self.value.len() == 8 &&
            self.value.chars().all(|c| c.is_ascii_digit()) &&
            self.value.as_str() >= "19000101" && self.value.as_str() <= "21000101";

        // LIKE operators always use text with wildcards
        match self.operator.to_lowercase().as_str() {
            "contains" => return FilterValue::Text(format!("%{}%", self.value)),
            "starts with" => return FilterValue::Text(format!("{}%", self.value)),
            "ends with" => return FilterValue::Text(format!("%{}", self.value)),
            _ => {}
        }

        // For comparison operators, try to parse based on column type
        match col_type_upper.as_str() {
            "INTEGER" => {
                // Special handling for date columns or YYYYMMDD values
                if is_date_column || value_looks_like_yyyymmdd {
                    if let Some(date_yyyymmdd) = parse_date_to_yyyymmdd(&self.value) {
                        // For dates in 2025+, convert to Excel serial format
                        // This matches old imported data that uses Excel serial dates
                        if date_yyyymmdd >= 20250101 && date_yyyymmdd < 21000101 {
                            if let Some(excel_serial) = yyyymmdd_to_excel_serial(date_yyyymmdd) {
                                return FilterValue::Integer(excel_serial);
                            }
                        }
                        return FilterValue::Integer(date_yyyymmdd);
                    }
                }

                // Try to parse as integer first
                if let Ok(n) = self.value.parse::<i64>() {
                    return FilterValue::Integer(n);
                }
                // Fallback to text if not a valid integer
                FilterValue::Text(self.value.clone())
            }
            "REAL" => {
                // Try to parse as real
                if let Ok(f) = self.value.parse::<f64>() {
                    return FilterValue::Real(f);
                }
                // Fallback to text if not a valid real
                FilterValue::Text(self.value.clone())
            }
            _ => {
                // TEXT or unknown types - use as-is
                FilterValue::Text(self.value.clone())
            }
        }
    }
}
