use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub name: String,
    pub client_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCombinationMember {
    pub client_name: String,
    pub client_key: String,
    pub display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCombination {
    pub id: i64,
    pub agent_name: String,
    pub members: Vec<ClientCombinationMember>,
    pub created_at: String,
    pub updated_at: String,
}

fn normalize_for_match(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| match c {
            'ă' | 'â' | 'á' | 'à' | 'ä' | 'ã' | 'å' => 'a',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'î' | 'í' | 'ì' | 'ï' => 'i',
            'ó' | 'ò' | 'ô' | 'ö' | 'õ' => 'o',
            'ú' | 'ù' | 'û' | 'ü' => 'u',
            'ș' | 'ş' => 's',
            'ț' | 'ţ' => 't',
            'ñ' => 'n',
            'ç' => 'c',
            _ => c,
        })
        .collect()
}

/// List all agents across EPro datasets AND TY Reports, deduplicated by normalized name.
/// client_count reflects unique clients across both sources.
#[tauri::command]
pub fn list_combination_agents(db: State<'_, DbState>) -> Result<Vec<AgentInfo>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    let mut agents: HashMap<String, (String, HashSet<String>)> = HashMap::new();

    // --- Scan EPro datasets tables ---
    let dataset_query = "SELECT table_name FROM datasets WHERE table_name IS NOT NULL";
    let mut ds_stmt = conn
        .prepare(dataset_query)
        .map_err(|e| format!("Failed to query datasets: {e}"))?;

    let table_names: Vec<String> = ds_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to read datasets: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    for table_name in &table_names {
        let pragma_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let mut pc = conn
            .prepare(&pragma_query)
            .map_err(|e| format!("PRAGMA failed for '{}': {e}", table_name))?;

        let col_names: Vec<String> = pc
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| format!("Failed to read columns for '{}': {e}", table_name))?
            .filter_map(|r| r.ok())
            .collect();

        let has_agent = col_names.iter().any(|c| c == "Agent");
        let has_client = col_names.iter().any(|c| c == "Client");

        if !has_agent || !has_client {
            continue;
        }

        let query = format!(
            "SELECT DISTINCT \"Agent\", \"Client\" FROM \"{}\" WHERE \"Agent\" IS NOT NULL AND \"Agent\" != '' AND \"Client\" IS NOT NULL AND \"Client\" != ''",
            table_name
        );

        let mut stmt = match conn.prepare(&query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let rows = match stmt.query_map([], |row| {
            let a: String = row.get(0)?;
            let c: String = row.get(1)?;
            Ok((a, c))
        }) {
            Ok(rows) => rows,
            Err(_) => continue,
        };

        for row in rows.filter_map(|r| r.ok()) {
            let (agent_val, client_val) = row;
            let agent_key = normalize_for_match(&agent_val);
            let client_key = normalize_for_match(&client_val);
            let entry = agents
                .entry(agent_key.clone())
                .or_insert_with(|| (agent_val.clone(), HashSet::new()));
            entry.1.insert(client_key);
        }
    }

    drop(ds_stmt);

    // --- Scan TY report tables ---
    let ty_query = "SELECT table_name FROM ty_reports WHERE table_name IS NOT NULL";
    let mut ty_stmt = conn
        .prepare(ty_query)
        .map_err(|e| format!("Failed to query ty_reports: {e}"))?;

    let ty_table_names: Vec<String> = ty_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to read ty_reports: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    for table_name in &ty_table_names {
        let pragma_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let mut pc = match conn.prepare(&pragma_query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let col_names: Vec<String> = match pc.query_map([], |row| row.get::<_, String>(1)) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => continue,
        };

        let normalized: Vec<String> = col_names.iter().map(|c| normalize_for_match(c)).collect();

        let agent_idx = normalized.iter().position(|c| c.contains("agent"));
        let client_idx = normalized.iter().position(|c| c.contains("client"));

        let (a_idx, c_idx) = match (agent_idx, client_idx) {
            (Some(a), Some(c)) => (a, c),
            _ => continue,
        };

        let agent_actual = &col_names[a_idx];
        let client_actual = &col_names[c_idx];

        let query = format!(
            "SELECT DISTINCT \"{}\", \"{}\" FROM \"{}\" WHERE \"{}\" IS NOT NULL AND \"{}\" != '' AND \"{}\" IS NOT NULL AND \"{}\" != ''",
            agent_actual, client_actual, table_name,
            agent_actual, agent_actual, client_actual, client_actual,
        );

        let mut stmt = match conn.prepare(&query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let rows = match stmt.query_map([], |row| {
            let a: String = row.get(0)?;
            let c: String = row.get(1)?;
            Ok((a, c))
        }) {
            Ok(rows) => rows,
            Err(_) => continue,
        };

        for row in rows.filter_map(|r| r.ok()) {
            let (agent_val, client_val) = row;
            let agent_key = normalize_for_match(&agent_val);
            let client_key = normalize_for_match(&client_val);
            let entry = agents
                .entry(agent_key.clone())
                .or_insert_with(|| (agent_val.clone(), HashSet::new()));
            entry.1.insert(client_key);
        }
    }

    let mut result: Vec<AgentInfo> = agents
        .into_iter()
        .map(|(_key, (display_name, clients))| AgentInfo {
            name: display_name,
            client_count: clients.len() as i64,
        })
        .collect();

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(result)
}

/// List distinct clients for a given agent across all EPro datasets AND TY Reports.
/// No dataset selection needed — scans both sources and deduplicates by normalized key.
#[tauri::command]
pub fn list_clients_for_agent(
    agent_name: String,
    db: State<'_, DbState>,
) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let agent_key = normalize_for_match(&agent_name);

    let mut clients: HashMap<String, String> = HashMap::new();

    // --- Scan EPro datasets tables ---
    let dataset_query = "SELECT table_name FROM datasets WHERE table_name IS NOT NULL";
    let mut ds_stmt = conn
        .prepare(dataset_query)
        .map_err(|e| format!("Failed to query datasets: {e}"))?;

    let table_names: Vec<String> = ds_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to read datasets: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    for table_name in &table_names {
        let pragma_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let mut pc = match conn.prepare(&pragma_query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let col_names: Vec<String> = match pc.query_map([], |row| row.get::<_, String>(1)) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => continue,
        };

        let has_agent = col_names.iter().any(|c| c == "Agent");
        let has_client = col_names.iter().any(|c| c == "Client");

        if !has_agent || !has_client {
            continue;
        }

        let query = format!(
            "SELECT DISTINCT \"Agent\", \"Client\" FROM \"{}\" WHERE \"Agent\" IS NOT NULL AND \"Agent\" != '' AND \"Client\" IS NOT NULL AND \"Client\" != ''",
            table_name
        );

        let mut stmt = match conn.prepare(&query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let rows = match stmt.query_map([], |row| {
            let a: String = row.get(0)?;
            let c: String = row.get(1)?;
            Ok((a, c))
        }) {
            Ok(rows) => rows,
            Err(_) => continue,
        };

        for row in rows.filter_map(|r| r.ok()) {
            let (agent_val, client_val) = row;
            if normalize_for_match(&agent_val) == agent_key {
                let ck = normalize_for_match(&client_val);
                clients.entry(ck).or_insert(client_val);
            }
        }
    }

    drop(ds_stmt);

    // --- Scan TY report tables ---
    let ty_query = "SELECT table_name FROM ty_reports WHERE table_name IS NOT NULL";
    let mut ty_stmt = conn
        .prepare(ty_query)
        .map_err(|e| format!("Failed to query ty_reports: {e}"))?;

    let ty_table_names: Vec<String> = ty_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to read ty_reports: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    for table_name in &ty_table_names {
        let pragma_query = format!("PRAGMA table_info(\"{}\")", table_name);
        let mut pc = match conn.prepare(&pragma_query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let col_names: Vec<String> = match pc.query_map([], |row| row.get::<_, String>(1)) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => continue,
        };

        let normalized: Vec<String> = col_names.iter().map(|c| normalize_for_match(c)).collect();

        let agent_idx = normalized.iter().position(|c| c.contains("agent"));
        let client_idx = normalized.iter().position(|c| c.contains("client"));

        let (a_idx, c_idx) = match (agent_idx, client_idx) {
            (Some(a), Some(c)) => (a, c),
            _ => continue,
        };

        let agent_actual = &col_names[a_idx];
        let client_actual = &col_names[c_idx];

        let query = format!(
            "SELECT DISTINCT \"{}\", \"{}\" FROM \"{}\" WHERE \"{}\" IS NOT NULL AND \"{}\" != '' AND \"{}\" IS NOT NULL AND \"{}\" != ''",
            agent_actual, client_actual, table_name,
            agent_actual, agent_actual, client_actual, client_actual,
        );

        let mut stmt = match conn.prepare(&query) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let rows = match stmt.query_map([], |row| {
            let a: String = row.get(0)?;
            let c: String = row.get(1)?;
            Ok((a, c))
        }) {
            Ok(rows) => rows,
            Err(_) => continue,
        };

        for row in rows.filter_map(|r| r.ok()) {
            let (agent_val, client_val) = row;
            if normalize_for_match(&agent_val) == agent_key {
                let ck = normalize_for_match(&client_val);
                clients.entry(ck).or_insert(client_val);
            }
        }
    }

    let mut result: Vec<String> = clients.into_values().collect();
    result.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(result)
}

/// List all client combinations for a given agent
#[tauri::command]
pub fn list_client_combinations(
    agent_name: String,
    db: State<'_, DbState>,
) -> Result<Vec<ClientCombination>, String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let agent_key = agent_name.trim().to_lowercase();

    let mut stmt = conn
        .prepare(
            "SELECT cc.id, cc.agent_name, cc.created_at, cc.updated_at,
                    ccm.client_name, ccm.client_key, ccm.display_order
             FROM client_combinations cc
             LEFT JOIN client_combination_members ccm ON ccm.combination_id = cc.id
             WHERE cc.agent_key = ?1
             ORDER BY cc.id, ccm.display_order",
        )
        .map_err(|e| format!("Failed to prepare query: {e}"))?;

    let rows: Vec<(i64, String, String, String, Option<String>, Option<String>, Option<i32>)> =
        stmt.query_map(params![agent_key], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })
        .map_err(|e| format!("Failed to query combinations: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    let mut combinations: Vec<ClientCombination> = vec![];
    let mut current_id: i64 = -1;

    for (id, agent_name, created_at, updated_at, client_name, client_key, display_order) in rows {
        if id != current_id {
            combinations.push(ClientCombination {
                id,
                agent_name,
                members: vec![],
                created_at,
                updated_at,
            });
            current_id = id;
        }
        if let (Some(name), Some(key), Some(order)) = (client_name, client_key, display_order) {
            combinations.last_mut().unwrap().members.push(ClientCombinationMember {
                client_name: name,
                client_key: key,
                display_order: order,
            });
        }
    }

    Ok(combinations)
}

/// Create a new client combination
#[tauri::command]
pub fn create_client_combination(
    agent_name: String,
    client_names: Vec<String>,
    db: State<'_, DbState>,
) -> Result<ClientCombination, String> {
    if client_names.len() < 2 {
        return Err("At least 2 clients are required".to_string());
    }

    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;
    let agent_key = agent_name.trim().to_lowercase();

    conn.execute(
        "INSERT INTO client_combinations (agent_name, agent_key) VALUES (?1, ?2)",
        params![agent_name, agent_key],
    )
    .map_err(|e| format!("Failed to create combination: {e}"))?;

    let combination_id = conn.last_insert_rowid();

    for (i, client_name) in client_names.iter().enumerate() {
        let client_key = client_name.trim().to_lowercase();
        let result: std::result::Result<usize, rusqlite::Error> = conn.execute(
            "INSERT INTO client_combination_members (combination_id, agent_key, client_name, client_key, display_order) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![combination_id, agent_key, client_name.as_str(), client_key, i as i32],
        );
        if let Err(e) = result {
            if e.to_string().contains("UNIQUE constraint failed") {
                let _ = conn.execute(
                    "DELETE FROM client_combinations WHERE id = ?1",
                    params![combination_id],
                );
                return Err(format!(
                    "Client \"{}\" is already in another combination for this agent",
                    client_name
                ));
            }
            return Err(format!("Failed to add member: {e}"));
        }
    }

    read_combination(&conn, combination_id)
}

/// Update an existing client combination's members
#[tauri::command]
pub fn update_client_combination(
    combination_id: i64,
    client_names: Vec<String>,
    db: State<'_, DbState>,
) -> Result<ClientCombination, String> {
    if client_names.len() < 2 {
        return Err("At least 2 clients are required".to_string());
    }

    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    let agent_key: String = conn
        .query_row(
            "SELECT agent_key FROM client_combinations WHERE id = ?1",
            params![combination_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Combination not found: {e}"))?;

    conn.execute(
        "DELETE FROM client_combination_members WHERE combination_id = ?1",
        params![combination_id],
    )
    .map_err(|e| format!("Failed to clear existing members: {e}"))?;

    for (i, client_name) in client_names.iter().enumerate() {
        let client_key = client_name.trim().to_lowercase();
        let result: std::result::Result<usize, rusqlite::Error> = conn.execute(
            "INSERT INTO client_combination_members (combination_id, agent_key, client_name, client_key, display_order) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![combination_id, agent_key, client_name.as_str(), client_key, i as i32],
        );
        if let Err(e) = result {
            if e.to_string().contains("UNIQUE constraint failed") {
                return Err(format!(
                    "Client \"{}\" is already in another combination for this agent",
                    client_name
                ));
            }
            return Err(format!("Failed to add member: {e}"));
        }
    }

    conn.execute(
        "UPDATE client_combinations SET updated_at = datetime('now') WHERE id = ?1",
        params![combination_id],
    )
    .map_err(|e| format!("Failed to update timestamp: {e}"))?;

    read_combination(&conn, combination_id)
}

/// Delete a client combination
#[tauri::command]
pub fn delete_client_combination(
    combination_id: i64,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| format!("DB lock error: {e}"))?;

    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM client_combinations WHERE id = ?1",
            params![combination_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Failed to check combination: {e}"))?;

    if !exists {
        return Err("Combination not found".to_string());
    }

    conn.execute(
        "DELETE FROM client_combination_members WHERE combination_id = ?1",
        params![combination_id],
    )
    .map_err(|e| format!("Failed to delete members: {e}"))?;

    conn.execute(
        "DELETE FROM client_combinations WHERE id = ?1",
        params![combination_id],
    )
    .map_err(|e| format!("Failed to delete combination: {e}"))?;

    Ok(())
}

/// Read a single combination by ID (takes &Connection to avoid re-locking)
fn read_combination(
    conn: &rusqlite::Connection,
    combination_id: i64,
) -> Result<ClientCombination, String> {
    let (id, agent_name, created_at, updated_at): (i64, String, String, String) = conn
        .query_row(
            "SELECT id, agent_name, created_at, updated_at FROM client_combinations WHERE id = ?1",
            params![combination_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| format!("Combination not found: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT client_name, client_key, display_order
             FROM client_combination_members
             WHERE combination_id = ?1
             ORDER BY display_order",
        )
        .map_err(|e| format!("Failed to query members: {e}"))?;

    let members: Vec<ClientCombinationMember> = stmt
        .query_map(params![combination_id], |row| {
            Ok(ClientCombinationMember {
                client_name: row.get(0)?,
                client_key: row.get(1)?,
                display_order: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to read members: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ClientCombination {
        id,
        agent_name,
        members,
        created_at,
        updated_at,
    })
}
