import type { DOMAINS, STACKS } from "./constants.js";

export type Domain = (typeof DOMAINS)[number];
export type Stack = (typeof STACKS)[number];

/** One CSV row from the UI UX Pro Max database; column names vary by domain. */
export type SearchRow = Record<string, string>;

/** Output of `search.py <query> [--domain|--stack] --json`. */
export interface SearchResult {
  [key: string]: unknown;
  domain: string;
  stack?: string;
  query: string;
  file: string;
  count: number;
  results: SearchRow[];
  auto_detected?: boolean;
  suggestions?: string[];
  truncated?: boolean;
  truncation_message?: string;
}

/** Design system dictionary produced by `search.py --design-system --json`. */
export interface DesignSystem {
  [key: string]: unknown;
  project_name: string;
  category: string;
  pattern?: { name?: string; sections?: string };
  style?: { id?: string; name?: string };
  colors?: Record<string, string>;
  typography?: { heading?: string; body?: string; google_fonts_url?: string };
}

export interface Persistence {
  status: "success" | "skipped_exists";
  design_system_dir: string;
  master_file: string;
  created_files: string[];
  message?: string;
}

export interface DesignSystemOutput {
  design_system: DesignSystem;
  persistence: Persistence | null;
}

export interface DesignDials {
  variance?: number;
  motion?: number;
  density?: number;
}
