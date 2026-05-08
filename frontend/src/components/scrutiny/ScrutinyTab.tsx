import { useState, useMemo } from 'react';
import FileUpload from '../common/FileUpload';
import DataTable from '../common/DataTable';
import Disclaimer from '../common/Disclaimer';
import SummaryCards from './SummaryCards';
import CategoryChart from './CategoryChart';
import LiveFilters, { defaultFilters, applyFilters, getSeverity } from './LiveFilters';
import type { FilterState } from './LiveFilters';
import { scrutinyApi } from '../../api/scrutinyApi';
import { triggerDownload } from '../../utils/format';
import type { ScrutinyResponse, FlaggedRow, SchemaPreviewResponse } from '../../types/scrutiny';

export default function ScrutinyTab() {
  const [file, setFile] = useState<File | null>(null);
  const [useMl, setUseMl] = useState(true);
  const [contamination, setContamination] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScrutinyResponse | null>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<SchemaPreviewResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters());

  const blockingMappingIssues = (mapping?.missing_required?.length ?? 0) > 0;

  const filteredRows = useMemo(() => {
    if (!results) return [];
    return applyFilters(results.flagged_rows, filters);
  }, [results, filters]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setFilters(defaultFilters());
    try {
      const data = await scrutinyApi.analyze(file, useMl, contamination);
      setResults(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewMapping = async () => {
    if (!file) return;
    setMappingLoading(true);
    setMappingError(null);
    setMapping(null);
    try {
      const data = await scrutinyApi.previewSchema(file);
      setMapping(data);
    } catch (e: unknown) {
      setMappingError(e instanceof Error ? e.message : 'Could not generate mapping preview');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResults(null);
    setError(null);
    setMapping(null);
    setMappingError(null);
  };

  const handleExport = async () => {
    if (!file) return;
    setExporting(true);
    try {
      const blob = await scrutinyApi.exportReport(file, useMl, contamination, true);
      triggerDownload(blob, 'scrutiny_report.xlsx');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Enrich rows with a severity field for the table display
  const displayRows = useMemo(
    () =>
      filteredRows.map((row: FlaggedRow) => ({
        ...row,
        severity: getSeverity(row.scrutiny_category),
      })),
    [filteredRows],
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-sm">
        Upload your General Ledger file (.csv or .xlsx). The engine will apply 6 rule-based checks
        (R1–R6) and an Isolation Forest ML model to flag suspicious transactions.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-2">Stage 1</p>
        <p className="text-sm font-medium text-slate-800 mb-4">Upload File</p>
        <FileUpload onFileSelect={handleFileSelect} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-2">Stage 2</p>
          <p className="text-sm font-medium text-slate-800">Map Columns to Canonical Schema</p>
          <p className="text-xs text-slate-500 mt-1">
            Preview how your file headers map to system fields before running scrutiny.
          </p>
        </div>

        <button
          onClick={handlePreviewMapping}
          disabled={!file || mappingLoading}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {mappingLoading ? 'Checking mapping...' : 'Check Column Mapping'}
        </button>

        {mappingError && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
            {mappingError}
          </div>
        )}

        {mapping && (
          <>
            <div className="overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Canonical Field</th>
                    <th className="text-left px-3 py-2 font-semibold">Source Column</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.mappings.map((item) => (
                    <tr key={item.canonical} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{item.canonical}</td>
                      <td className="px-3 py-2 text-slate-600">{item.source_column || 'Not found'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'mapped' || item.status === 'derived'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'defaulted'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {blockingMappingIssues && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
                Required canonical fields missing: {mapping.missing_required.join(', ')}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="w-full">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-2">Stage 3</p>
          <p className="text-sm font-medium text-slate-800 mb-1">Run Scrutiny</p>
          {!mapping && file && (
            <p className="text-xs text-amber-700">Run Stage 2 mapping check before analysis.</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={useMl}
            onChange={(e) => setUseMl(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 accent-blue-600"
          />
          Enable Isolation Forest (ML)
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          Contamination:
          <input
            type="range"
            min={0.01}
            max={0.2}
            step={0.01}
            value={contamination}
            onChange={(e) => setContamination(parseFloat(e.target.value))}
            disabled={!useMl}
            className="w-32"
          />
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
            {contamination.toFixed(2)}
          </span>
        </label>

        <button
          onClick={handleAnalyze}
          disabled={!file || loading || !mapping || blockingMappingIssues}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Running scrutiny analysis...
        </div>
      )}

      {results && (
        <>
          <SummaryCards summary={results.summary} />
          <CategoryChart data={results.category_counts} />

          {/* Live Filters — rule, severity, account, date range */}
          <LiveFilters
            rows={results.flagged_rows}
            filters={filters}
            onChange={setFilters}
          />

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Flagged Transactions (
              {filteredRows.length.toLocaleString()} of{' '}
              {results.flagged_rows.length.toLocaleString()} rows)
            </h3>
            <DataTable rows={displayRows as unknown as Record<string, unknown>[]} />
          </div>

          <Disclaimer />

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {exporting ? 'Generating report...' : 'Download Scrutiny Report (.xlsx)'}
          </button>
        </>
      )}
    </div>
  );
}
