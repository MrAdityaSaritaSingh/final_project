import type { FlaggedRow } from '@/types/scrutiny';
import type { InvestigationFilters, InvestigationWorkspaceState, ControlRow } from './types';

export function toText(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export function splitCategories(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function rupeesToCr(amount: number): string {
  return `Rs.${(amount / 10000000).toFixed(1)} Cr`;
}

export function computeRiskBuckets(flaggedRows: FlaggedRow[]) {
  const initial = {
    high: { count: 0, exposure: 0 },
    medium: { count: 0, exposure: 0 },
    low: { count: 0, exposure: 0 },
  };

  for (const row of flaggedRows) {
    const amount = Math.abs(Number(row.amount) || 0);
    const categories = splitCategories(toText(row.scrutiny_category));

    const isHigh =
      categories.includes('ML Anomaly') ||
      categories.includes('Manual Journal') ||
      amount >= 100000;
    const isMedium =
      categories.includes('Period End') ||
      categories.includes('Weekend Entries') ||
      categories.includes('Duplicate Check') ||
      categories.includes('Round Numbers');

    if (isHigh) {
      initial.high.count += 1;
      initial.high.exposure += amount;
    } else if (isMedium) {
      initial.medium.count += 1;
      initial.medium.exposure += amount;
    } else {
      initial.low.count += 1;
      initial.low.exposure += amount;
    }
  }

  return initial;
}

export function rowsByCategory(flaggedRows: FlaggedRow[], name: string): FlaggedRow[] {
  return flaggedRows.filter((row) => splitCategories(toText(row.scrutiny_category)).includes(name));
}

export function buildControls(flaggedRows: FlaggedRow[]): ControlRow[] {
  const manual = rowsByCategory(flaggedRows, 'Manual Journal');
  const duplicate = rowsByCategory(flaggedRows, 'Duplicate Check');
  const weakNarration = rowsByCategory(flaggedRows, 'Weak Narration');
  const ml = rowsByCategory(flaggedRows, 'ML Anomaly');
  const periodEnd = rowsByCategory(flaggedRows, 'Period End');
  const weekend = rowsByCategory(flaggedRows, 'Weekend Entries');
  const round = rowsByCategory(flaggedRows, 'Round Numbers');
  const unusualAmount = flaggedRows.filter((row) => Math.abs(Number(row.amount) || 0) >= 150000);

  const sumAmount = (rows: FlaggedRow[]) => rows.reduce((acc, row) => acc + Math.abs(Number(row.amount) || 0), 0);

  return [
    {
      controlName: 'Manual Entry',
      triggeredTransactions: manual.length,
      exposure: sumAmount(manual),
      status: 'Active',
    },
    {
      controlName: 'Unusual Amount',
      triggeredTransactions: unusualAmount.length,
      exposure: sumAmount(unusualAmount),
      status: 'Active',
    },
    {
      controlName: 'Sequence Gap',
      triggeredTransactions: duplicate.length,
      exposure: sumAmount(duplicate),
      status: 'Active',
    },
    {
      controlName: 'Suspicious Keyword',
      triggeredTransactions: weakNarration.length,
      exposure: sumAmount(weakNarration),
      status: 'Inactive',
    },
    {
      controlName: 'Outlier Anomaly',
      triggeredTransactions: ml.length,
      exposure: sumAmount(ml),
      status: 'Active',
    },
    {
      controlName: 'Period End Transaction',
      triggeredTransactions: periodEnd.length,
      exposure: sumAmount(periodEnd),
      status: 'Active',
    },
    {
      controlName: 'Weekend Entry',
      triggeredTransactions: weekend.length,
      exposure: sumAmount(weekend),
      status: 'Active',
    },
    {
      controlName: 'Round Number Pattern',
      triggeredTransactions: round.length,
      exposure: sumAmount(round),
      status: 'Active',
    },
  ];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatShortDate(value?: string): string {
  if (!value) return 'Recently updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const deltaMs = Date.now() - date.getTime();
  const hours = Math.floor(deltaMs / 3600000);
  if (hours < 1) return 'Last modified just now';
  if (hours < 24) return `Last modified ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `Last modified ${days} day${days === 1 ? '' : 's'} ago`;
}

export const EMPTY_FILTERS: InvestigationFilters = {
  ledgerType: '',
  accountSeries: '',
  financialYear: '',
  quarter: 'all',
  customThreshold: '',
  amountPreset: '',
  keyword: '',
  voucherTypes: [],
  currencies: [],
};

export function cloneFilters(source: InvestigationFilters): InvestigationFilters {
  return {
    ledgerType: source.ledgerType,
    accountSeries: source.accountSeries,
    financialYear: source.financialYear,
    quarter: source.quarter,
    customThreshold: source.customThreshold,
    amountPreset: source.amountPreset,
    keyword: source.keyword,
    voucherTypes: [...source.voucherTypes],
    currencies: [...source.currencies],
  };
}

export function createWorkspace(index: number): InvestigationWorkspaceState {
  return {
    id: `tab-${Date.now()}-${index}`,
    label: `Investigation ${index}`,
    draftFilters: cloneFilters(EMPTY_FILTERS),
    appliedFilters: cloneFilters(EMPTY_FILTERS),
    queryInput: '',
    appliedQuery: '',
    hasRequested: false,
  };
}

export function getRowValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return String(row[key]);
    }
  }
  return '';
}

export function getRowAmount(row: Record<string, unknown>): number {
  const direct = Number(getRowValue(row, ['amount', 'Amount']));
  if (Number.isFinite(direct) && direct > 0) return Math.abs(direct);

  const debit = Number(getRowValue(row, ['debit', 'Debit']));
  const credit = Number(getRowValue(row, ['credit', 'Credit']));
  if (Number.isFinite(debit) || Number.isFinite(credit)) {
    return Math.abs(Number.isFinite(debit) ? debit : 0) + Math.abs(Number.isFinite(credit) ? credit : 0);
  }
  return 0;
}

export function toFileSafeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'audit_working_paper';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function rowMatchesQuery(row: Record<string, unknown>, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const hay = Object.values(row)
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ');

  // Check amount filter (e.g., "above 500k", "over 100000")
  const amountMatch = trimmed.match(/(?:above|over|greater than)\s*₹?\s*([\d,]+)/i);
  if (amountMatch) {
    const threshold = Number(amountMatch[1].replace(/,/g, ''));
    if (Number.isFinite(threshold) && getRowAmount(row) <= threshold) {
      return false; // Exclude row if amount doesn't meet the threshold
    }
  }

  // Check text search tokens
  const tokens = trimmed
    .replace(/(?:above|over|greater than)\s*₹?\s*[\d,]+/gi, '') // Remove amount filter from query
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !['show', 'list', 'find', 'transaction', 'transactions', 'above', 'over', 'than'].includes(token));

  // If no text tokens left after removing amount filter, only amount filter was specified
  if (tokens.length === 0) {
    return true; // Amount filter already passed
  }

  // If text tokens exist, match ANY of them (OR logic)
  return tokens.some((token) => hay.includes(token));
}
