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

// Map simple operators to SQL
impl SimpleFilter {
    pub fn to_sql_operator(&self) -> &'static str {
        match self.operator.as_str() {
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

    pub fn transform_value(&self) -> String {
        match self.operator.as_str() {
            "contains" => format!("%{}%", self.value),
            "starts with" => format!("{}%", self.value),
            "ends with" => format!("%{}", self.value),
            _ => self.value.clone(),
        }
    }
}
