export interface ScrutinySummary {
  total_entries: number;
  rule_flagged: number;
  ml_flagged: number;
  total_flagged: number;
  pct_flagged: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface FlaggedRow {
  voucher_no: string;
  date: string;
  ledger_name: string;
  amount: number;
  dr_cr: string;
  narration: string;
  voucher_type: string;
  posted_by?: string;
  cost_center?: string;
  fiscal_year?: string;
  scrutiny_category: string;
  scrutiny_reason: string;
  ml_anomaly_flag?: number;
  ml_anomaly_score?: number;
}

export interface ScrutinyResponse {
  summary: ScrutinySummary;
  category_counts: CategoryCount[];
  flagged_rows: FlaggedRow[];
  review_rows: Record<string, unknown>[];
}

export type MappingStatus = 'mapped' | 'derived' | 'missing' | 'defaulted';

export interface CanonicalMapping {
  canonical: string;
  source_column: string | null;
  required: boolean;
  status: MappingStatus;
}

export interface SchemaPreviewResponse {
  original_columns: string[];
  normalised_columns: string[];
  mappings: CanonicalMapping[];
  missing_required: string[];
  rows_detected?: number;
  columns_detected?: number;
  sample_rows?: Record<string, string>[];
  health_summary?: {
    total_transactions: number;
    total_debit: number;
    total_credit: number;
    debit_equals_credit: boolean;
    date_from: string | null;
    date_to: string | null;
    missing_narrations: number;
    duplicate_journal_ids: number;
    manual_entries: number;
  };
}

export type DisplayRow = FlaggedRow & { severity: 'High' | 'Medium' | 'Low' };
