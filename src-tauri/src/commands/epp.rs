//! EPP (Agent Performance) report commands.
//!
//! Generates quarterly reports grouped by client for a specific agent.

use crate::db::DbState;
use chrono::{Datelike, NaiveDate, Duration};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Unique agent information with client count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub name: String,
    pub client_count: i64,
}

/// Single row in the EPP report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EppRow {
    pub client: String,
    pub agent: String,
    pub q1_total: f64,
    pub q2_total: f64,
    pub q3_total: f64,
    pub q4_total: f64,
    pub total_anual: f64,
    pub reducere: f64,     // 7.5% reduction
    pub total: f64,         // same as reducere
    pub program: String,    // program name or "-"
    pub procent: String,    // percentage or "-"
    pub culoare_decolorare_q1: f64,
    pub culoare_decolorare_q2: f64,
    pub culoare_decolorare_q3: f64,
    pub culoare_decolorare_q4: f64,
}

/// Complete EPP report result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EppReportResult {
    pub agent_name: String,
    pub year: i32,
    pub rows: Vec<EppRow>,
}

/// Get all unique agents from all dataset tables
#[tauri::command]
pub fn get_unique_agents(db: State<'_, DbState>) -> Result<Vec<AgentInfo>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    // Get all datasets with their info
    let mut stmt = conn
        .prepare("SELECT id, table_name FROM datasets ORDER BY name")
        .map_err(|e| format!("Failed to query datasets: {e}"))?;

    let datasets: Vec<(i64, String)> = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let table_name: String = row.get(1)?;
            Ok((id, table_name))
        })
        .map_err(|e| format!("Failed to read dataset names: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to parse dataset names: {e}"))?;

    let mut agents: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    // Query each table for unique agents and their client counts
    for (_dataset_id, table_name) in datasets {
        // Check if Agent column exists in this table
        let check_column: Result<(), _> = conn.query_row(
            &format!("SELECT \"Agent\" FROM \"{}\" LIMIT 1", table_name),
            [],
            |_| Ok(()),
        );

        if check_column.is_err() {
            // This table doesn't have an Agent column, skip it
            continue;
        }

        // Get unique agents and their distinct client counts for this table
        let query = format!(
            "SELECT \"Agent\", COUNT(DISTINCT \"Client\") as client_count \
             FROM \"{}\" \
             WHERE \"Agent\" IS NOT NULL AND \"Agent\" != '' \
             GROUP BY \"Agent\"",
            table_name
        );

        let mut table_stmt = conn.prepare(&query)
            .map_err(|e| format!("Failed to prepare query for table {}: {}", table_name, e))?;

        let rows = table_stmt
            .query_map([], |row| {
                let agent: String = row.get(0)?;
                let count: i64 = row.get(1)?;
                Ok((agent, count))
            })
            .map_err(|e| format!("Failed to query agents from table {}: {}", table_name, e))?;

        for row in rows {
            if let Ok((agent, count)) = row {
                *agents.entry(agent).or_insert(0) += count;
            }
        }
    }

    // Convert to sorted Vec<AgentInfo>
    let mut result: Vec<AgentInfo> = agents
        .into_iter()
        .map(|(name, client_count)| AgentInfo { name, client_count })
        .collect();

    result.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(result)
}

/// Get unique agents from a specific dataset
#[tauri::command]
pub fn get_agents_for_dataset(db: State<'_, DbState>, dataset_id: i64) -> Result<Vec<AgentInfo>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    // Get the table name for this dataset
    let table_name: String = conn
        .query_row(
            "SELECT table_name FROM datasets WHERE id = ?1",
            params![dataset_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Dataset not found: {e}"))?;

    // Check if Agent column exists
    let check_column: Result<(), _> = conn.query_row(
        &format!("SELECT \"Agent\" FROM \"{}\" LIMIT 1", table_name),
        [],
        |_| Ok(()),
    );

    if check_column.is_err() {
        // This table doesn't have an Agent column
        return Ok(Vec::new());
    }

    // Get unique agents and their distinct client counts
    let query = format!(
        "SELECT \"Agent\", COUNT(DISTINCT \"Client\") as client_count \
         FROM \"{}\" \
         WHERE \"Agent\" IS NOT NULL AND \"Agent\" != '' \
         GROUP BY \"Agent\" \
         ORDER BY \"Agent\"",
        table_name
    );

    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            let agent: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok(AgentInfo { name: agent, client_count: count })
        })
        .map_err(|e| format!("Failed to query agents: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to parse agents: {e}"))?;

    Ok(rows)
}

/// Generate EPP report for a specific agent, year, and dataset
#[tauri::command]
pub fn generate_epp_report(
    agent_name: String,
    year: Option<i32>,
    dataset_id: Option<i64>,
    db: State<'_, DbState>,
) -> Result<EppReportResult, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    let report_year = year.unwrap_or(2025);

    // Get table names - either specific dataset or all datasets
    let table_names: Vec<String> = if let Some(ds_id) = dataset_id {
        // Get only the specified dataset table
        let table_name: String = conn
            .query_row(
                "SELECT table_name FROM datasets WHERE id = ?1",
                params![ds_id],
                |r| r.get(0),
            )
            .map_err(|e| format!("Dataset not found: {e}"))?;
        vec![table_name]
    } else {
        // Get all dataset tables (for backwards compatibility)
        let mut stmt = conn
            .prepare("SELECT table_name FROM datasets ORDER BY name")
            .map_err(|e| format!("Failed to query datasets: {e}"))?;

        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed to read dataset names: {e}"))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| format!("Failed to parse dataset names: {e}"))?;

        rows
    };

    // Debug: log what we're querying
    eprintln!("DEBUG: generate_epp_report called with agent='{}', year={}, dataset_id={:?}", agent_name, report_year, dataset_id);
    eprintln!("DEBUG: table_names={:?}", table_names);

    let mut client_data: std::collections::HashMap<String, ClientData> = std::collections::HashMap::new();

    // Query each table for data matching the agent
    for table_name in &table_names {
        // Check if required columns exist
        let columns_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let mut cols_stmt = conn.prepare(&columns_query)
            .map_err(|e| format!("Failed to check columns for table {}: {}", table_name, e))?;

        let column_names: Vec<String> = cols_stmt
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })
            .map_err(|e| format!("Failed to read columns: {e}"))?
            .collect::<Result<_, _>>()
            .map_err(|e| format!("Failed to parse columns: {e}"))?;

        eprintln!("DEBUG: Table '{}' has columns: {:?}", table_name, column_names);

        let has_agent = column_names.iter().any(|c| c == "Agent");
        let has_client = column_names.iter().any(|c| c == "Client");
        let has_date = column_names.iter().any(|c| c == "Data");
        let has_value = column_names.iter().any(|c| c == "Valoare_Contabila");
        let has_cod = column_names.iter().any(|c| c == "Cod");

        eprintln!("DEBUG: has_agent={}, has_client={}, has_date={}, has_value={}, has_cod={}",
            has_agent, has_client, has_date, has_value, has_cod);

        if !has_agent || !has_client || !has_date || !has_value {
            eprintln!("DEBUG: Skipping table '{}' - missing required columns", table_name);
            continue;
        }

        // Query data for this agent and year
        // Include Cod column if it exists, otherwise use NULL
        let query = if has_cod {
            format!(
                "SELECT \"Client\", \"Data\", \"Valoare_Contabila\", \"Cod\" \
                 FROM \"{}\" \
                 WHERE \"Agent\" = ?1",
                table_name
            )
        } else {
            format!(
                "SELECT \"Client\", \"Data\", \"Valoare_Contabila\", NULL as \"Cod\" \
                 FROM \"{}\" \
                 WHERE \"Agent\" = ?1",
                table_name
            )
        };

        let mut data_stmt = conn.prepare(&query)
            .map_err(|e| format!("Failed to prepare data query: {e}"))?;

        let row_count: Result<i64, _> = conn.query_row(
            &format!("SELECT COUNT(*) FROM \"{}\" WHERE \"Agent\" = ?1", table_name),
            params![agent_name],
            |r| r.get(0)
        );

        if let Ok(count) = row_count {
            eprintln!("DEBUG: Table '{}' has {} rows for agent '{}'", table_name, count, agent_name);
        }

        let rows = data_stmt
            .query_map(params![agent_name], |row| {
                // Try using get_ref to see actual column data
                let client_ref = row.get_ref(0).unwrap(); // First column: Client
                let date_ref = row.get_ref(1).unwrap();   // Second column: Data
                let value_ref = row.get_ref(2).unwrap();  // Third column: Valoare_Contabila
                let cod_ref = row.get_ref(3).unwrap();    // Fourth column: Cod

                eprintln!("DEBUG: Ref - client={:?}, date={:?}, value={:?}, cod={:?}",
                    client_ref, date_ref, value_ref, cod_ref);

                let client = match client_ref {
                    rusqlite::types::ValueRef::Text(s) => {
                        std::str::from_utf8(s).unwrap_or("").to_string()
                    }
                    _ => String::new()
                };
                let date_str = match date_ref {
                    rusqlite::types::ValueRef::Text(s) => {
                        std::str::from_utf8(s).unwrap_or("").to_string()
                    }
                    rusqlite::types::ValueRef::Integer(i) => {
                        // Convert Excel serial date to ISO string
                        excel_date_to_iso(i)
                    }
                    _ => String::new()
                };

                let value = match value_ref {
                    rusqlite::types::ValueRef::Integer(i) => i as f64,
                    rusqlite::types::ValueRef::Real(r) => r,
                    rusqlite::types::ValueRef::Text(s) => {
                        let s_str = std::str::from_utf8(s).unwrap_or("");
                        s_str.replace(',', ".").parse().unwrap_or(0.0)
                    }
                    rusqlite::types::ValueRef::Null => 0.0,
                    _ => 0.0,
                };

                let cod = match cod_ref {
                    rusqlite::types::ValueRef::Text(s) => {
                        std::str::from_utf8(s).unwrap_or("").to_string()
                    }
                    _ => String::new()
                };

                Ok((client, date_str, value, cod))
            })
            .map_err(|e| format!("Failed to query data: {e}"))?;

        let mut row_count = 0;
        for row in rows {
            row_count += 1;
            if let Ok((client, date_str, value, cod)) = row {
                // Show first 3 rows as samples
                if row_count <= 3 {
                    eprintln!("DEBUG: Sample row {} - client='{}', date='{}', value={}, cod='{}'",
                        row_count, client, date_str, value, cod);
                }

                if client.is_empty() {
                    continue;
                }

                // Always create an entry for this client, even if value is 0
                let entry = client_data.entry(client.clone()).or_insert_with(|| ClientData {
                    client: client.clone(),
                    agent: agent_name.clone(),
                    q1: 0.0,
                    q2: 0.0,
                    q3: 0.0,
                    q4: 0.0,
                    culoare_decolorare_q1: 0.0,
                    culoare_decolorare_q2: 0.0,
                    culoare_decolorare_q3: 0.0,
                    culoare_decolorare_q4: 0.0,
                });

                // Only add value if it's non-zero and date matches
                if value > 0.0 {
                    let quarter = parse_quarter(&date_str, report_year);

                    if let Some(q) = quarter {
                        match q {
                            1 => entry.q1 += value,
                            2 => entry.q2 += value,
                            3 => entry.q3 += value,
                            4 => entry.q4 += value,
                            _ => {}
                        }

                        // Culoare+Decolorare calculation
                        if !cod.is_empty() {
                            if let Ok(subgrupa) = conn.query_row(
                                "SELECT LOWER(subgrupa) FROM subgroups WHERE LOWER(cod) = LOWER(?1) LIMIT 1",
                                params![cod],
                                |row| row.get::<_, String>(0)
                            ) {
                                let subgrupa_lower = subgrupa.to_lowercase();
                                if subgrupa_lower == "culoare" || subgrupa_lower == "decolorare" {
                                    match q {
                                        1 => entry.culoare_decolorare_q1 += value,
                                        2 => entry.culoare_decolorare_q2 += value,
                                        3 => entry.culoare_decolorare_q3 += value,
                                        4 => entry.culoare_decolorare_q4 += value,
                                        _ => {}
                                    }
                                }
                            }
                            // If query returns error (no match), just skip - treated as 0
                        }
                    } else {
                        // Debug: log why date parsing failed
                        eprintln!("DEBUG: Date '{}' didn't parse to quarter for year {}", date_str, report_year);
                    }
                }
            }
        }
    }

    // If no data found for the selected year, try again without year filter
    if client_data.is_empty() {
        for table_name in &table_names {
            // Skip tables that don't have required columns
            let columns_query = format!("PRAGMA table_info(\"{}\")", table_name);
            let mut cols_stmt = conn.prepare(&columns_query)
                .map_err(|e| format!("Failed to check columns for table {}: {}", table_name, e))?;

            let column_names: Vec<String> = cols_stmt
                .query_map([], |row| row.get(1))
                .map_err(|e| format!("Failed to read columns: {e}"))?
                .collect::<Result<_, _>>()
                .map_err(|e| format!("Failed to parse columns: {e}"))?;

            let has_agent = column_names.iter().any(|c| c == "Agent");
            let has_client = column_names.iter().any(|c| c == "Client");
            let has_date = column_names.iter().any(|c| c == "Data");
            let has_value = column_names.iter().any(|c| c == "Valoare_Contabila");
            let has_cod = column_names.iter().any(|c| c == "Cod");

            if !has_agent || !has_client || !has_date || !has_value {
                continue;
            }

            // Query without year filter - just get all data for this agent
            // Include Cod column if it exists, otherwise use NULL
            let query = if has_cod {
                format!(
                    "SELECT \"Client\", \"Data\", \"Valoare_Contabila\", \"Cod\" \
                     FROM \"{}\" \
                     WHERE \"Agent\" = ?1",
                    table_name
                )
            } else {
                format!(
                    "SELECT \"Client\", \"Data\", \"Valoare_Contabila\", NULL as \"Cod\" \
                     FROM \"{}\" \
                     WHERE \"Agent\" = ?1",
                    table_name
                )
            };

            let mut data_stmt = conn.prepare(&query)
                .map_err(|e| format!("Failed to prepare data query: {e}"))?;

            let rows = data_stmt
                .query_map(params![agent_name], |row| {
                    // Use get_ref to handle both Text and Integer dates
                    let client_ref = row.get_ref(0).unwrap();
                    let date_ref = row.get_ref(1).unwrap();
                    let value_ref = row.get_ref(2).unwrap();
                    let cod_ref = row.get_ref(3).unwrap();

                    let client = match client_ref {
                        rusqlite::types::ValueRef::Text(s) => {
                            std::str::from_utf8(s).unwrap_or("").to_string()
                        }
                        _ => String::new()
                    };

                    let date_str = match date_ref {
                        rusqlite::types::ValueRef::Text(s) => {
                            std::str::from_utf8(s).unwrap_or("").to_string()
                        }
                        rusqlite::types::ValueRef::Integer(i) => {
                            // Convert Excel serial date to ISO string
                            excel_date_to_iso(i)
                        }
                        _ => String::new()
                    };

                    let value = match value_ref {
                        rusqlite::types::ValueRef::Integer(i) => i as f64,
                        rusqlite::types::ValueRef::Real(r) => r,
                        rusqlite::types::ValueRef::Text(s) => {
                            let s_str = std::str::from_utf8(s).unwrap_or("");
                            s_str.replace(',', ".").parse().unwrap_or(0.0)
                        }
                        rusqlite::types::ValueRef::Null => 0.0,
                        _ => 0.0,
                    };

                    let cod = match cod_ref {
                        rusqlite::types::ValueRef::Text(s) => {
                            std::str::from_utf8(s).unwrap_or("").to_string()
                        }
                        _ => String::new()
                    };

                    Ok((client, date_str, value, cod))
                })
                .map_err(|e| format!("Failed to query data: {e}"))?;

            for row in rows {
                if let Ok((client, date_str, value, cod)) = row {
                    if client.is_empty() {
                        continue;
                    }

                    // Always create entry, even with zero value
                    let entry = client_data.entry(client.clone()).or_insert_with(|| ClientData {
                        client: client.clone(),
                        agent: agent_name.clone(),
                        q1: 0.0,
                        q2: 0.0,
                        q3: 0.0,
                        q4: 0.0,
                        culoare_decolorare_q1: 0.0,
                        culoare_decolorare_q2: 0.0,
                        culoare_decolorare_q3: 0.0,
                        culoare_decolorare_q4: 0.0,
                    });

                    // Only add value if it's non-zero and date parses
                    if value > 0.0 {
                        let date = parse_date_flexible(&date_str);

                        if let Some(d) = date {
                            let month = d.month() as u32;
                            match month {
                                1..=3 => {
                                    entry.q1 += value;
                                    // Culoare+Decolorare calculation
                                    if !cod.is_empty() {
                                        if let Ok(subgrupa) = conn.query_row(
                                            "SELECT LOWER(subgrupa) FROM subgroups WHERE LOWER(cod) = LOWER(?1) LIMIT 1",
                                            params![cod],
                                            |row| row.get::<_, String>(0)
                                        ) {
                                            let subgrupa_lower = subgrupa.to_lowercase();
                                            if subgrupa_lower == "culoare" || subgrupa_lower == "decolorare" {
                                                entry.culoare_decolorare_q1 += value;
                                            }
                                        }
                                    }
                                }
                                4..=6 => {
                                    entry.q2 += value;
                                    // Culoare+Decolorare calculation
                                    if !cod.is_empty() {
                                        if let Ok(subgrupa) = conn.query_row(
                                            "SELECT LOWER(subgrupa) FROM subgroups WHERE LOWER(cod) = LOWER(?1) LIMIT 1",
                                            params![cod],
                                            |row| row.get::<_, String>(0)
                                        ) {
                                            let subgrupa_lower = subgrupa.to_lowercase();
                                            if subgrupa_lower == "culoare" || subgrupa_lower == "decolorare" {
                                                entry.culoare_decolorare_q2 += value;
                                            }
                                        }
                                    }
                                }
                                7..=9 => {
                                    entry.q3 += value;
                                    // Culoare+Decolorare calculation
                                    if !cod.is_empty() {
                                        if let Ok(subgrupa) = conn.query_row(
                                            "SELECT LOWER(subgrupa) FROM subgroups WHERE LOWER(cod) = LOWER(?1) LIMIT 1",
                                            params![cod],
                                            |row| row.get::<_, String>(0)
                                        ) {
                                            let subgrupa_lower = subgrupa.to_lowercase();
                                            if subgrupa_lower == "culoare" || subgrupa_lower == "decolorare" {
                                                entry.culoare_decolorare_q3 += value;
                                            }
                                        }
                                    }
                                }
                                10..=12 => {
                                    entry.q4 += value;
                                    // Culoare+Decolorare calculation
                                    if !cod.is_empty() {
                                        if let Ok(subgrupa) = conn.query_row(
                                            "SELECT LOWER(subgrupa) FROM subgroups WHERE LOWER(cod) = LOWER(?1) LIMIT 1",
                                            params![cod],
                                            |row| row.get::<_, String>(0)
                                        ) {
                                            let subgrupa_lower = subgrupa.to_lowercase();
                                            if subgrupa_lower == "culoare" || subgrupa_lower == "decolorare" {
                                                entry.culoare_decolorare_q4 += value;
                                            }
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        }
    }

    // Convert to EppRow with calculations
    let mut rows: Vec<EppRow> = client_data
        .into_values()
        .map(|data| {
            let total_anual = data.q1 + data.q2 + data.q3 + data.q4;
            let reducere = total_anual * 0.925; // 7.5% reduction
            let total = reducere;

            let (program, procent) = calculate_program(total);

            EppRow {
                client: data.client,
                agent: data.agent,
                q1_total: data.q1,
                q2_total: data.q2,
                q3_total: data.q3,
                q4_total: data.q4,
                total_anual,
                reducere,
                total,
                program,
                procent,
                culoare_decolorare_q1: data.culoare_decolorare_q1,
                culoare_decolorare_q2: data.culoare_decolorare_q2,
                culoare_decolorare_q3: data.culoare_decolorare_q3,
                culoare_decolorare_q4: data.culoare_decolorare_q4,
            }
        })
        .collect();

    // Sort by client name
    rows.sort_by(|a, b| a.client.cmp(&b.client));

    Ok(EppReportResult {
        agent_name,
        year: report_year,
        rows,
    })
}

/// Holds quarterly totals for a client
struct ClientData {
    client: String,
    agent: String,
    q1: f64,
    q2: f64,
    q3: f64,
    q4: f64,
    culoare_decolorare_q1: f64,
    culoare_decolorare_q2: f64,
    culoare_decolorare_q3: f64,
    culoare_decolorare_q4: f64,
}

/// Normalize date string by padding single-digit days/months with leading zeros
fn normalize_date(date_str: &str) -> String {
    let trimmed = date_str.trim();

    if trimmed.matches('/').count() == 2 {
        let parts: Vec<&str> = trimmed.split('/').collect();
        if parts.len() == 3 {
            let day = parts[0].trim();
            let month = parts[1].trim();
            let year = parts[2].trim();

            let day_padded = if day.len() == 1 { format!("0{}", day) } else { day.to_string() };
            let month_padded = if month.len() == 1 { format!("0{}", month) } else { month.to_string() };

            return format!("{}/{}/{}", day_padded, month_padded, year);
        }
    } else if trimmed.matches('-').count() == 2 {
        let parts: Vec<&str> = trimmed.split('-').collect();
        if parts.len() == 3 {
            let day = parts[0].trim();
            let month = parts[1].trim();
            let year = parts[2].trim();

            let day_padded = if day.len() == 1 { format!("0{}", day) } else { day.to_string() };
            let month_padded = if month.len() == 1 { format!("0{}", month) } else { month.to_string() };

            return format!("{}-{}-{}", day_padded, month_padded, year);
        }
    }

    trimmed.to_string()
}

/// Convert Excel serial date to ISO date string (YYYY-MM-DD)
///
/// Excel stores dates as days since December 30, 1899 (with the 1900 leap year bug).
/// For example, 45859 represents July 1, 2025.
fn excel_date_to_iso(excel_serial: i64) -> String {
    // Excel epoch is December 30, 1899 (day 0)
    // Excel day 1 = January 1, 1900
    if let Some(duration) = Duration::try_days(excel_serial) {
        if let Some(date) = NaiveDate::from_ymd_opt(1899, 12, 30) {
            if let Some(result) = date.checked_add_signed(duration) {
                return result.format("%Y-%m-%d").to_string();
            }
        }
    }
    String::new()
}

/// Parse a date string into a NaiveDate, trying multiple formats
fn parse_date_flexible(date_str: &str) -> Option<chrono::NaiveDate> {
    let normalized = normalize_date(date_str);

    chrono::NaiveDate::parse_from_str(&normalized, "%Y-%m-%d")
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%d/%m/%Y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%d-%m-%Y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%Y/%m/%d"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%d.%m.%Y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%Y.%m.%d"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%m/%d/%Y"))
        .or_else(|_| chrono::NaiveDate::parse_from_str(&normalized, "%m-%d-%Y"))
        .ok()
}

/// Parse a date string and return the quarter (1-4) if it matches the report year
fn parse_quarter(date_str: &str, report_year: i32) -> Option<u32> {
    let date = parse_date_flexible(date_str)?;

    if date.year() != report_year {
        return None;
    }

    let month = date.month() as u32;
    match month {
        1..=3 => Some(1),
        4..=6 => Some(2),
        7..=9 => Some(3),
        10..=12 => Some(4),
        _ => None,
    }
}

/// Calculate program tier and percentage based on total amount
fn calculate_program(total: f64) -> (String, String) {
    if total < 15000.0 {
        ("-".to_string(), "-".to_string())
    } else if total <= 29999.0 {
        ("Starter 🌱 5%".to_string(), "5%".to_string())
    } else if total <= 49999.0 {
        ("Explorer 🚀 6%".to_string(), "6%".to_string())
    } else if total <= 74999.0 {
        ("Artist 🎨 7%".to_string(), "7%".to_string())
    } else if total <= 100000.0 {
        ("Master ⏳ 8%".to_string(), "8%".to_string())
    } else {
        ("Prestige 🌟 10%".to_string(), "10%".to_string())
    }
}
