use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimpleQuery {
    pub dataset_id: i64,
    pub display_columns: Vec<String>,
    pub group_by: Vec<String>,
    pub calculations: Vec<Calculation>,
    pub filters: Vec<Filter>,
    pub sort_by: Vec<SortColumn>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Calculation {
    pub function: String, // "sum", "count", "avg", "min", "max"
    pub column: String,
    pub alias: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Filter {
    pub column: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Deserialize, Clone)]
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
impl Filter {
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
