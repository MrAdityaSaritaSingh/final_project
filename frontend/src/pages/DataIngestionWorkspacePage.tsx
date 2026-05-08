import { useEffect, useMemo, useState } from 'react';

import { scrutinyApi } from '../api/scrutinyApi';
import type { SchemaPreviewResponse } from '../types/scrutiny';
import type { SaveWorkbookEntityConfigPayload, WorkbookEntityConfig } from '../types/workbook';
import { formatNumber } from '../utils/format';

interface DataIngestionWorkspacePageProps {
  initialConfig?: WorkbookEntityConfig | null;
  saving?: boolean;
  runningAnalysis?: boolean;
  error?: string | null;
  onSave: (payload: SaveWorkbookEntityConfigPayload) => Promise<void>;
  onRunAnalysis: (file: File) => Promise<void>;
}

interface EntityFormState {
  entityName: string;
  financialYear: string;
  ledgerType: string;
  functionalCurrency: string;
  reportingCurrency: string;
  companyCode: string;
}

type SystemField =
  | 'Date'
  | 'Journal ID'
  | 'Account Name'
  | 'Debit'
  | 'Credit'
  | 'Narration'
  | 'User ID'
  | 'Currency'
  | 'Cost Center';

const SYSTEM_FIELDS: { label: SystemField; required: boolean }[] = [
  { label: 'Date', required: true },
  { label: 'Journal ID', required: true },
  { label: 'Account Name', required: true },
  { label: 'Debit', required: true },
  { label: 'Credit', required: true },
  { label: 'Narration', required: true },
  { label: 'User ID', required: false },
  { label: 'Currency', required: false },
  { label: 'Cost Center', required: false },
];

const INITIAL_FORM: EntityFormState = {
  entityName: '',
  financialYear: '',
  ledgerType: '',
  functionalCurrency: '',
  reportingCurrency: '',
  companyCode: '',
};

const FINANCIAL_YEAR_OPTIONS = [
  'April 2025 - March 2026',
  'April 2024 - March 2025',
  'April 2023 - March 2024',
  'April 2022 - March 2023',
];
const LEDGER_TYPE_OPTIONS = ['General Ledger', 'Sub-Ledger', 'Consolidated Ledger', 'Trial Balance Extract'];
const CURRENCY_OPTIONS = ['INR - Indian Rupee', 'USD - US Dollar', 'EUR - Euro', 'GBP - British Pound'];

const AUTO_MAP_HINTS: Record<SystemField, string[]> = {
  Date: ['date', 'voucher_date', 'entry_date', 'posting_date'],
  'Journal ID': ['journal_id', 'voucher_no', 'voucher_number', 'vch_no', 'entry_no', 'transaction_id'],
  'Account Name': ['account', 'ledger', 'ledger_name', 'particulars', 'account_name'],
  Debit: ['debit', 'dr', 'dr_amount', 'debit_amount'],
  Credit: ['credit', 'cr', 'cr_amount', 'credit_amount'],
  Narration: ['narration', 'description', 'remarks', 'notes'],
  'User ID': ['user', 'posted_by', 'user_id', 'created_by'],
  Currency: ['currency', 'curr', 'ccy'],
  'Cost Center': ['cost_center', 'costcentre', 'department'],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function toInrCompact(value: number): string {
  if (!Number.isFinite(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 10000000) {
    return `Rs.${(value / 10000000).toFixed(1)} Cr`;
  }
  if (abs >= 100000) {
    return `Rs.${(value / 100000).toFixed(1)} L`;
  }
  return `Rs.${Math.round(value).toLocaleString('en-IN')}`;
}

function autoMapColumns(columns: string[]): Record<SystemField, string> {
  const byNormalized = new Map<string, string>();
  columns.forEach((col) => byNormalized.set(normalize(col), col));

  const mapping: Partial<Record<SystemField, string>> = {};
  for (const field of SYSTEM_FIELDS) {
    const hints = AUTO_MAP_HINTS[field.label];
    let chosen = '';
    for (const hint of hints) {
      const exact = byNormalized.get(hint);
      if (exact) {
        chosen = exact;
        break;
      }
      const contains = columns.find((col) => normalize(col).includes(hint));
      if (contains) {
        chosen = contains;
        break;
      }
    }
    mapping[field.label] = chosen;
  }

  return mapping as Record<SystemField, string>;
}

export default function DataIngestionWorkspacePage({
  initialConfig,
  saving = false,
  runningAnalysis = false,
  error = null,
  onSave,
  onRunAnalysis,
}: DataIngestionWorkspacePageProps) {
  const [form, setForm] = useState<EntityFormState>(INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SchemaPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<SystemField, string>>(() =>
    autoMapColumns([]),
  );

  useEffect(() => {
    if (!initialConfig) return;
    setForm({
      entityName: initialConfig.entity_name || '',
      financialYear: initialConfig.financial_year || '',
      ledgerType: initialConfig.ledger_type || '',
      functionalCurrency: initialConfig.functional_currency || '',
      reportingCurrency: initialConfig.reporting_currency || '',
      companyCode: initialConfig.company_code || '',
    });
  }, [initialConfig]);

  const canSaveEntity = useMemo(
    () =>
      form.entityName.trim().length >= 2 &&
      form.financialYear.trim().length > 0 &&
      form.ledgerType.trim().length > 0 &&
      form.functionalCurrency.trim().length > 0,
    [form.entityName, form.financialYear, form.ledgerType, form.functionalCurrency],
  );

  const isEntityConfigured = !!initialConfig || !!(
    form.entityName && form.financialYear && form.ledgerType && form.functionalCurrency
  );

  const requiredMapped = SYSTEM_FIELDS.filter((field) => field.required).every(
    (field) => (columnMapping[field.label] || '').trim().length > 0,
  );

  const health = preview?.health_summary;
  const canIngest = !!file && isEntityConfigured && !previewLoading;
  const canRunAnalysis = !!file && !!preview && !!health && isEntityConfigured && requiredMapped && !previewLoading;

  const sampleRows = preview?.sample_rows ?? [];

  const dataPreviewColumns = useMemo(() => {
    const order: SystemField[] = ['Date', 'Journal ID', 'Account Name', 'Debit', 'Credit', 'Narration'];
    return order.filter((field) => (columnMapping[field] || '').trim().length > 0);
  }, [columnMapping]);

  const updateField = (key: keyof EntityFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (localError) setLocalError(null);
  };

  const handleConfigureEntity = async () => {
    if (!canSaveEntity) {
      setLocalError('Please fill all required fields in Entity Configuration.');
      return;
    }

    await onSave({
      entity_name: form.entityName.trim(),
      financial_year: form.financialYear.trim(),
      ledger_type: form.ledgerType.trim(),
      functional_currency: form.functionalCurrency.trim(),
      reporting_currency: form.reportingCurrency.trim() || undefined,
      company_code: form.companyCode.trim() || undefined,
    });
  };

  const handleFileChosen = async (incoming: File) => {
    setFile(incoming);
    setPreview(null);
    setPreviewError(null);
    setColumnMapping(autoMapColumns([]));
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    void handleFileChosen(selected);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setColumnMapping(autoMapColumns([]));
  };

  const handleIngestData = async () => {
    if (!file) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const payload = await scrutinyApi.previewSchema(file);
      setPreview(payload);
      setColumnMapping(autoMapColumns(payload.original_columns ?? []));
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Unable to ingest file for mapping.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!file) return;
    await onRunAnalysis(file);
  };

  return (
    <div className="max-w-[1500px] mx-auto py-8 px-6 space-y-6">
      <div className="border border-slate-300 bg-white">
        <div className="px-8 py-6 border-b border-slate-200">
          <h1 className="text-4xl font-semibold text-slate-900">Data Ingestion Workspace</h1>
        </div>

        <div className="px-8 py-5 flex items-center gap-8 text-[30px] border-b border-slate-200">
          <StepPill completed={isEntityConfigured} label="Step 1: Entity Configured" />
          <StepPill completed={!!file} label="Step 2: Upload & Map Ledger" />
        </div>

        <div className="p-8 border-b border-slate-200">
          <h2 className="text-4xl font-semibold text-slate-900 mb-2">1. Entity Configuration</h2>
          <p className="text-2xl text-slate-600 mb-6">Define the financial and reporting context for this ledger.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Entity Name" required>
              <input
                value={form.entityName}
                onChange={(e) => updateField('entityName', e.target.value)}
                placeholder="Enter entity name"
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              />
            </Field>

            <Field label="Financial Year" required>
              <select
                value={form.financialYear}
                onChange={(e) => updateField('financialYear', e.target.value)}
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              >
                <option value="">Select financial year</option>
                {FINANCIAL_YEAR_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ledger Type" required>
              <select
                value={form.ledgerType}
                onChange={(e) => updateField('ledgerType', e.target.value)}
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              >
                <option value="">Select ledger type</option>
                {LEDGER_TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Functional Currency" required>
              <select
                value={form.functionalCurrency}
                onChange={(e) => updateField('functionalCurrency', e.target.value)}
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              >
                <option value="">Select currency</option>
                {CURRENCY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reporting Currency (Optional)">
              <select
                value={form.reportingCurrency}
                onChange={(e) => updateField('reportingCurrency', e.target.value)}
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              >
                <option value="">Select currency</option>
                {CURRENCY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Company Code / Subsidiary (Optional)">
              <input
                value={form.companyCode}
                onChange={(e) => updateField('companyCode', e.target.value)}
                placeholder="Enter company code"
                className="w-full border border-slate-300 px-4 py-3 text-xl"
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleConfigureEntity()}
              disabled={!canSaveEntity || saving}
              className="rounded-xl bg-[#0f766e] px-8 py-3 text-white text-2xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Configure Entity'}
            </button>
          </div>
        </div>

        <div className="p-8 border-b border-slate-200">
          <h2 className="text-4xl font-semibold text-slate-900 mb-2">2. File Upload & Mapping</h2>
          <p className="text-2xl text-slate-600 mb-6">
            Upload ledger file and map required fields before analysis.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6">
            <div className="border-2 border-dashed border-slate-300 p-8 bg-white flex flex-col items-center justify-center min-h-[300px] text-center">
              {!file ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4 4 4M4 16.5v2.25A2.25 2.25 0 006.25 21h11.5A2.25 2.25 0 0020 18.75V16.5" />
                    </svg>
                  </div>
                  <p className="text-4xl text-slate-700 mb-2">Upload CSV or Excel file</p>
                  <p className="text-2xl text-slate-500 mb-5">Supported formats: .csv, .xlsx</p>
                  <label className="inline-flex items-center justify-center border border-slate-300 bg-white px-7 py-2.5 text-2xl cursor-pointer hover:bg-slate-100">
                    Select File
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />
                  </label>
                </>
              ) : (
                <>
                  <p className="text-2xl text-slate-600">File selected</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-2">{file.name}</p>
                  <p className="text-lg text-slate-500 mt-2 mb-4">{(file.size / 1024).toFixed(2)} KB</p>
                  <label className="mt-2 inline-flex items-center justify-center border border-slate-300 bg-white px-7 py-2.5 text-2xl cursor-pointer hover:bg-slate-100">
                    Change File
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />
                  </label>
                </>
              )}
            </div>

            <div className="border border-slate-300 p-6 bg-white min-h-[300px] flex items-center justify-center">
              {!preview ? (
                <button
                  type="button"
                  disabled={!canIngest || previewLoading}
                  onClick={() => void handleIngestData()}
                  className="rounded-2xl bg-[#0f766e] px-10 py-4 text-3xl font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {previewLoading ? 'Ingesting...' : 'Ingest Data'}
                </button>
              ) : (
                <div className="w-full">
                  <h3 className="text-3xl font-semibold text-slate-900 mb-5">File Details</h3>
                  <div className="space-y-3 text-2xl text-slate-700">
                    <p className="flex items-center justify-between gap-3">
                      <span>File Name:</span>
                      <span className="font-medium text-slate-900">{file?.name ?? '--'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span>File Size:</span>
                      <span className="font-medium text-slate-900">{file ? `${(file.size / 1024).toFixed(2)} KB` : '--'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span>Rows Detected:</span>
                      <span className="font-medium text-slate-900">{preview?.rows_detected ? formatNumber(preview.rows_detected) : '--'}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span>Columns Detected:</span>
                      <span className="font-medium text-slate-900">{preview?.columns_detected ? formatNumber(preview.columns_detected) : '--'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {previewLoading && <p className="mt-4 text-lg text-slate-500">Scanning uploaded file...</p>}
          {previewError && (
            <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{previewError}</p>
          )}

          {preview && (
            <div className="mt-6 max-w-[420px]">
              <label className="block text-2xl font-semibold text-slate-800 mb-2">Header Row Position</label>
              <select className="w-full border border-slate-300 px-4 py-2.5 text-2xl bg-white" value="row-1" onChange={() => undefined}>
                <option value="row-1">Row 1</option>
              </select>
            </div>
          )}

          {preview && (
            <div className="mt-6 border border-slate-300">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-2xl font-semibold text-slate-900">
                Column Mapping
              </div>
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-lg font-semibold text-slate-700">System Field</th>
                    <th className="px-4 py-3 text-lg font-semibold text-slate-700">Mapped Column</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_FIELDS.map((field) => (
                    <tr key={field.label} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 text-lg text-slate-800">
                        {field.label}
                        {field.required ? <span className="text-red-500">*</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={columnMapping[field.label] || ''}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({ ...prev, [field.label]: e.target.value }))
                          }
                          className="w-full border border-slate-300 px-3 py-2 text-lg"
                        >
                          <option value="">Select column</option>
                          {(preview.original_columns || []).map((column: string) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sampleRows.length > 0 && (
            <div className="mt-6 border border-slate-300">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-2xl font-semibold text-slate-900">
                Data Preview
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      {dataPreviewColumns.map((field) => (
                        <th key={field} className="px-4 py-3 text-lg font-semibold text-slate-700">
                          {field === 'Account Name' ? 'Account' : field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row: Record<string, any>, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                        {dataPreviewColumns.map((field) => {
                          const mappedColumn = columnMapping[field];
                          return (
                            <td key={`${idx}-${field}`} className="px-4 py-3 text-lg text-slate-700">
                              {mappedColumn ? String(row[mappedColumn] ?? '') : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {preview && health && (
          <div className="p-8">
            <h2 className="text-4xl font-semibold text-slate-900 mb-2">3. Data Health Summary</h2>
            <p className="text-2xl text-slate-600 mb-6">Structural validation of ledger prior to risk analysis.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Total Transactions" value={health ? formatNumber(health.total_transactions) : '--'} />
              <MetricCard label="Total Debit" value={health ? toInrCompact(health.total_debit) : '--'} />
              <MetricCard label="Total Credit" value={health ? toInrCompact(health.total_credit) : '--'} />
              <MetricCard
                label="Date Range"
                value={health?.date_from && health?.date_to ? `${health.date_from} - ${health.date_to}` : '--'}
              />
            </div>

            <div className="space-y-2 text-lg text-slate-700 mb-6">
              <HealthItem
                ok={!!health?.debit_equals_credit}
                label={health ? (health.debit_equals_credit ? 'Debit = Credit' : 'Debit != Credit') : '--'}
              />
              <HealthItem
                ok={health ? health.missing_narrations === 0 : true}
                label={health ? `${formatNumber(health.missing_narrations)} Missing Narrations` : '--'}
              />
              <HealthItem
                ok={health ? health.duplicate_journal_ids === 0 : true}
                label={health ? `${formatNumber(health.duplicate_journal_ids)} Duplicate Journal IDs` : '--'}
              />
              <HealthItem
                ok={health ? health.manual_entries < Math.max(5, health.total_transactions * 0.1) : true}
                label={health ? `${formatNumber(health.manual_entries)} Manual Entries` : '--'}
              />
            </div>

            <p className="text-lg text-slate-600 mb-5">Review data issues before proceeding to risk analysis.</p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-300 px-6 py-3 text-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={!canRunAnalysis || runningAnalysis}
                onClick={() => void handleRunAnalysis()}
                className="rounded-xl bg-[#0f766e] px-8 py-3 text-xl font-semibold text-white disabled:opacity-50"
              >
                {runningAnalysis ? 'Running...' : 'Run Risk Analysis'}
              </button>
            </div>
          </div>
        )}

        {preview && !health && (
          <div className="p-8 border-t border-slate-200">
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Data health metrics were not returned by backend. Restart backend and click Ingest Data again.
            </div>
          </div>
        )}
      </div>

      {(localError || error) && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {localError || error}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-2xl font-semibold text-slate-800 mb-1.5">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function StepPill({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`w-6 h-6 rounded-full border flex items-center justify-center ${
          completed ? 'border-emerald-500 text-emerald-600' : 'border-slate-400 text-transparent'
        }`}
      >
        ✓
      </span>
      <span className="text-3xl text-slate-800">{label}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-lg text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function HealthItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span>{label}</span>
    </div>
  );
}
