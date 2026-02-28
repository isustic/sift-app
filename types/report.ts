// Query state types
export interface SimpleQuery {
  datasetId: number;
  displayColumns: string[];
  groupBy: string[];
  calculations: Calculation[];
  filters: Filter[];
  sortBy: SortColumn[];
  limit: number | null;
}

export interface Calculation {
  function: "sum" | "count" | "avg" | "min" | "max";
  column: string;
  alias: string;
}

export interface Filter {
  column: string;
  operator: string;
  value: string;
}

export interface SortColumn {
  column: string;
  descending: boolean;
}

// Metadata types
export interface Dataset {
  id: number;
  name: string;
}

export interface ColumnMeta {
  id: number;
  name: string;
  col_type: string; // "INTEGER", "REAL", "TEXT"
}

export interface Template {
  id: number;
  name: string;
  dataset_id: number | null;
  config_json: string;
}

// UI State
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface StepState {
  currentStep: StepNumber;
  canGoNext: boolean;
  canGoBack: boolean;
}

// Result types
export interface ReportResult {
  rows: Record<string, unknown>[];
  queryTime: number;
  rowCount: number;
}
