// Subgroup types for test page
// Matches Rust Subgroup and SubgroupsResult structs

export interface Subgroup {
  cod: string;
  denumire: string;
  grupa: string;
  subgrupa: string;
}

export interface SubgroupsResult {
  rows: Subgroup[];
  total: number;
  page: number;
  page_size: number;
}
