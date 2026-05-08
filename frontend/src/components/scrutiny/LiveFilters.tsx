// LiveFilters.tsx — Mar 18 task
// Four live filters for the Scrutiny flagged-rows table:
//   1. Rule          — multiselect pill toggles (derived from data)
//   2. Severity      — High / Medium / Low (derived from rule category)
//   3. Account       — searchable multiselect (derived from ledger_name)
//   4. Date Range    — min/max date inputs

import { useMemo, useState } from 'react';
import type { FlaggedRow } from '../../types/scrutiny';

// ── Severity mapping ──────────────────────────────────────────────────────────
export const SEVERITY_MAP: Record<string, 'High' | 'Medium' | 'Low'> = {
  'Duplicate Check': 'High',
  'ML Anomaly':      'High',
  'Round Numbers':   'Medium',
  'Manual Journal':  'Medium',
  'Period End':      'Medium',
  'Weekend Entries': 'Low',
  'Weak Narration':  'Low',
};

const SEVERITY_ORDER: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

const SEVERITY_STYLE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border-red-300',
  Medium: 'bg-amber-100 text-amber-700 border-amber-300',
  Low:    'bg-green-100 text-green-700 border-green-300',
};

export function getSeverity(category: string): 'High' | 'Medium' | 'Low' {
  const cats = category.split(',').map((c) => c.trim());
  for (const sev of SEVERITY_ORDER) {
    if (cats.some((c) => SEVERITY_MAP[c] === sev)) return sev;
  }
  return 'Low';
}

// ── Filter state ──────────────────────────────────────────────────────────────
export interface FilterState {
  rules:      string[];   // empty = show all
  severities: string[];   // empty = show all
  accounts:   string[];   // empty = show all
  dateFrom:   string;     // 'YYYY-MM-DD' or ''
  dateTo:     string;     // 'YYYY-MM-DD' or ''
}

export function defaultFilters(): FilterState {
  return { rules: [], severities: [], accounts: [], dateFrom: '', dateTo: '' };
}

export function applyFilters(rows: FlaggedRow[], f: FilterState): FlaggedRow[] {
  return rows.filter((row) => {
    // Rule filter
    if (f.rules.length > 0) {
      const rowRules = row.scrutiny_category.split(',').map((c) => c.trim());
      if (!f.rules.some((r) => rowRules.includes(r))) return false;
    }
    // Severity filter
    if (f.severities.length > 0) {
      if (!f.severities.includes(getSeverity(row.scrutiny_category))) return false;
    }
    // Account filter
    if (f.accounts.length > 0) {
      if (!f.accounts.includes(row.ledger_name)) return false;
    }
    // Date range filter
    const rowDate = row.date.slice(0, 10); // normalise to YYYY-MM-DD
    if (f.dateFrom && rowDate < f.dateFrom) return false;
    if (f.dateTo   && rowDate > f.dateTo)   return false;
    return true;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface LiveFiltersProps {
  rows:     FlaggedRow[];
  filters:  FilterState;
  onChange: (f: FilterState) => void;
}

export default function LiveFilters({ rows, filters, onChange }: LiveFiltersProps) {
  const [accountSearch, setAccountSearch] = useState('');

  // Derive available options from the current dataset
  const availableRules = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) =>
      r.scrutiny_category.split(',').forEach((c) => set.add(c.trim())),
    );
    return [...set].sort();
  }, [rows]);

  const availableAccounts = useMemo(() => {
    return [...new Set(rows.map((r) => r.ledger_name))].sort();
  }, [rows]);

  const dateMin = useMemo(
    () => rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0]?.date ?? '').slice(0, 10),
    [rows],
  );
  const dateMax = useMemo(
    () => rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0]?.date ?? '').slice(0, 10),
    [rows],
  );

  const filteredAccounts = availableAccounts.filter((a) =>
    a.toLowerCase().includes(accountSearch.toLowerCase()),
  );

  const activeCount =
    filters.rules.length +
    filters.severities.length +
    filters.accounts.length +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Live Filters
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {activeCount} active
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            onClick={() => { onChange(defaultFilters()); setAccountSearch(''); }}
            className="text-xs text-red-500 hover:text-red-700 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* ── 1. Rule filter ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Rule
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableRules.map((rule) => (
              <button
                key={rule}
                onClick={() => onChange({ ...filters, rules: toggle(filters.rules, rule) })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.rules.includes(rule)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                {rule}
              </button>
            ))}
            {filters.rules.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, rules: [] })}
                className="px-2.5 py-1 rounded-full text-xs text-red-500 border border-red-200 hover:bg-red-50"
              >
                ✕ clear
              </button>
            )}
          </div>
          {filters.rules.length === 0 && (
            <p className="text-xs text-slate-400">All rules shown</p>
          )}
        </div>

        {/* ── 2. Severity filter ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Severity
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_ORDER.map((sev) => (
              <button
                key={sev}
                onClick={() =>
                  onChange({ ...filters, severities: toggle(filters.severities, sev) })
                }
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.severities.includes(sev)
                    ? SEVERITY_STYLE[sev]
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                {sev}
              </button>
            ))}
            {filters.severities.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, severities: [] })}
                className="px-2.5 py-1 rounded-full text-xs text-red-500 border border-red-200 hover:bg-red-50"
              >
                ✕ clear
              </button>
            )}
          </div>
          {filters.severities.length === 0 && (
            <p className="text-xs text-slate-400">All severities shown</p>
          )}
        </div>

        {/* ── 3. Account filter ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Account / Ledger
          </p>
          <input
            type="text"
            placeholder="Search accounts…"
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
            {filteredAccounts.length === 0 && (
              <p className="text-xs text-slate-400 py-1">No accounts match</p>
            )}
            {filteredAccounts.map((acc) => (
              <label
                key={acc}
                className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.accounts.includes(acc)}
                  onChange={() =>
                    onChange({ ...filters, accounts: toggle(filters.accounts, acc) })
                  }
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs text-slate-700 truncate">{acc}</span>
              </label>
            ))}
          </div>
          {filters.accounts.length > 0 && (
            <button
              onClick={() => onChange({ ...filters, accounts: [] })}
              className="text-xs text-red-500 hover:underline"
            >
              ✕ clear ({filters.accounts.length} selected)
            </button>
          )}
        </div>

        {/* ── 4. Date range filter ─────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Date Range
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">From</label>
              <input
                type="date"
                min={dateMin}
                max={filters.dateTo || dateMax}
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">To</label>
              <input
                type="date"
                min={filters.dateFrom || dateMin}
                max={dateMax}
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => onChange({ ...filters, dateFrom: '', dateTo: '' })}
                className="text-xs text-red-500 hover:underline"
              >
                ✕ clear dates
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
