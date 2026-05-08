import { useState, useCallback } from 'react';
import { SENSITIVITY_STEPS } from '../components/layout/AppShell';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME.includes(file.type) || file.type === '';
  if (!hasValidExt || !hasValidMime) {
    return `Invalid file type. Please upload a CSV or Excel (.xlsx) file. Got: ${file.name}`;
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'File size exceeds 50 MB. Please upload a smaller file.';
  }
  return null;
}

interface UploadPageProps {
  file: File | null;
  sensitivityStep: number;
  loading: boolean;
  onFileSelect: (file: File) => void;
  onSensitivityChange: (step: number) => void;
  onAnalyze: () => void;
}

export default function UploadPage({
  file,
  sensitivityStep,
  loading,
  onFileSelect,
  onSensitivityChange,
  onAnalyze,
}: UploadPageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setFileError(err);
        return;
      }
      setFileError(null);
      onFileSelect(f);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const currentSensitivity = SENSITIVITY_STEPS[sensitivityStep];

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* ── Step 1: Upload ── */}
      <SectionCard step={1} title="Upload Ledger File">
        <p className="text-sm text-slate-500 mb-4">
          Upload your General Ledger export file for AI-powered anomaly analysis.
          Supported formats: <span className="font-medium text-slate-700">CSV, XLSX</span>
        </p>

        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
            fileError
              ? 'border-red-300 bg-red-50'
              : dragOver
              ? 'border-[#0F766E] bg-teal-50 scale-[1.01]'
              : file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-300 hover:border-[#0F766E] hover:bg-teal-50/50 bg-white'
          }`}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleChange}
            className="hidden"
          />

          {file && !fileError ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB · Click to replace
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                fileError ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-5 h-5 ${fileError ? 'text-red-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">
                  Drag & drop your GL file here
                </p>
                <p className="text-xs text-slate-400 mt-0.5">or click to browse · CSV, XLSX up to 50 MB</p>
              </div>
            </>
          )}
        </label>

        {/* File error */}
        {fileError && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {fileError}
          </div>
        )}
      </SectionCard>

      {/* ── Step 2: Settings ── */}
      <SectionCard step={2} title="Analysis Settings">

        {/* AI toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-700">AI-Based Anomaly Detection</p>
              <Tooltip text="Uses machine learning to detect unusual patterns beyond simple rules">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </Tooltip>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Detects complex patterns invisible to rule-based checks
            </p>
          </div>
          <ToggleSwitch value={aiEnabled} onChange={setAiEnabled} />
        </div>

        {/* Sensitivity */}
        <div className={`mt-5 pt-5 border-t border-slate-100 transition-opacity ${aiEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-700">Detection Sensitivity</p>
              <Tooltip text="Higher sensitivity catches more anomalies but may include false positives. Lower is more conservative.">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </Tooltip>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${[
              'bg-slate-100 text-slate-600 border-slate-200',
              'bg-green-50 text-green-700 border-green-200',
              'bg-teal-50 text-teal-700 border-teal-200',
              'bg-orange-50 text-orange-700 border-orange-200',
              'bg-red-50 text-red-700 border-red-200',
            ][sensitivityStep]}`}>
              {currentSensitivity.label}
            </span>
          </div>

          {/* Pill steps */}
          <div className="flex gap-1.5">
            {SENSITIVITY_STEPS.map((step, i) => (
              <button
                key={step.label}
                onClick={() => onSensitivityChange(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  i === sensitivityStep ? step.active : step.inactive
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 px-1">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>
      </SectionCard>

      {/* ── CTA ── */}
      <button
        onClick={onAnalyze}
        disabled={!file || !!fileError || loading}
        className="w-full py-4 bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Run Analysis
          </>
        )}
      </button>

      {!file && !loading && (
        <p className="text-center text-xs text-slate-400">
          Upload a ledger file above to begin
        </p>
      )}

    </div>
  );
}

/* ── Helper components ── */

function SectionCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-6 h-6 rounded-lg bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
        value ? 'bg-[#0F766E]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-[11px] rounded-lg shadow-lg w-48 text-center leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}
