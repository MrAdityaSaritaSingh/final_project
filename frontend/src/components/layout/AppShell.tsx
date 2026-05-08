import React, { useState, useMemo, useEffect } from 'react';
import { scrutinyApi } from '@/api/scrutinyApi';
import { workbooksApi } from '@/api/workbooksApi';
import { triggerDownload } from '@/utils/format';
import type { ScrutinyResponse } from '@/types/scrutiny';
import type { SaveWorkbookEntityConfigPayload, Workbook, WorkbookEntityConfig } from '@/types/workbook';
import DashboardPage from '@/pages/DashboardPage';
import ClientDashboardPage from '@/pages/ClientDashboardPage';
import FlaggedTransactionsPage from '@/pages/FlaggedTransactionsPage';
import AuditReportPage from '@/pages/AuditReportPage';
import DataIngestionWorkspacePage from '@/pages/DataIngestionWorkspacePage';

export type Page = 'dashboard' | 'clients' | 'ingestion' | 'results' | 'insights';

/* ─── Sensitivity mapping ─────────────────────────────────────────── */
export const SENSITIVITY_STEPS = [
  { label: 'Very Low',  value: 0.02, active: 'bg-slate-500 text-white shadow-sm',  inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' },
  { label: 'Low',       value: 0.04, active: 'bg-green-600 text-white shadow-sm',  inactive: 'bg-green-50 text-green-700 hover:bg-green-100' },
  { label: 'Balanced',  value: 0.07, active: 'bg-[#0F766E] text-white shadow-sm',  inactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  { label: 'High',      value: 0.12, active: 'bg-orange-500 text-white shadow-sm', inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  { label: 'Very High', value: 0.18, active: 'bg-red-600 text-white shadow-sm',    inactive: 'bg-red-50 text-red-600 hover:bg-red-100' },
];

/* ─── Nav items ───────────────────────────────────────────────────── */
const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode; workflow?: boolean }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a8.94 8.94 0 003.75-1.37A17.93 17.93 0 0012 15c-3.18 0-6.168.824-8.75 2.27A8.94 8.94 0 006 18.72m12 0a9 9 0 11-12 0m12 0a9 9 0 00-12 0m9-10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'ingestion',
    label: 'Data Ingestion',
    workflow: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5v3.75H3.75V4.5zm0 5.25h16.5v3.75H3.75V9.75zm0 5.25h16.5v3.75H3.75V15z" />
      </svg>
    ),
  },
  {
    id: 'results',
    label: 'Suspicious Transactions',
    workflow: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    id: 'insights',
    label: 'Insights & Report',
    workflow: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
];

/* ─── Analysis progress steps ─────────────────────────────────────── */
const ANALYSIS_STEPS = [
  'Validating ledger structure...',
  'Applying rule-based audit checks...',
  'Running AI anomaly detection...',
  'Computing risk scores...',
  'Generating audit insights...',
];

function AnalysisOverlay({ estimatedEntries, onDone }: { estimatedEntries: number | null; onDone?: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => {
        const next = Math.min(i + 1, ANALYSIS_STEPS.length - 1);
        setProgress(Math.min(4 + next * 18, 92));
        return next;
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onDone) onDone();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-slate-200">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-14 h-14">
            <div className="w-14 h-14 border-4 border-teal-100 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        <h2 className="text-center text-base font-bold text-slate-800 mb-1">
          Analyzing Your Ledger
        </h2>
        <p className="text-center text-xs text-slate-500 mb-6">
          {estimatedEntries != null
            ? `Analyzing ${estimatedEntries.toLocaleString()} entries...`
            : 'Analyzing ledger entries...'}
        </p>

        {/* Progress bar */}
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 text-right mb-5">{progress}%</p>

        {/* Step list */}
        <ul className="space-y-2.5">
          {ANALYSIS_STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2.5 text-xs">
              {i < stepIdx ? (
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              ) : i === stepIdx ? (
                <span className="w-4 h-4 rounded-full border-2 border-[#0F766E] flex-shrink-0 animate-pulse" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />
              )}
              <span className={i <= stepIdx ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                {step}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

async function estimateEntries(file: File): Promise<number | null> {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv')) {
    return null;
  }

  try {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '')
      .length;
    return Math.max(0, rows - 1);
  } catch {
    return null;
  }
}

/* ─── Workflow step indicator ─────────────────────────────────────── */
const WORKFLOW_STEPS: { id: Page; label: string }[] = [
  { id: 'ingestion', label: 'Ingestion' },
  { id: 'results', label: 'Results' },
  { id: 'insights', label: 'Insights' },
];

function WorkflowSteps({
  current,
  hasResults,
  onClick,
}: {
  current: Page;
  hasResults: boolean;
  onClick: (p: Page) => void;
}) {
  const workflowPages: Page[] = ['ingestion', 'results', 'insights'];
  const currentIdx = workflowPages.indexOf(current);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-0 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
      {WORKFLOW_STEPS.map((step, i) => {
        const stepIdx = workflowPages.indexOf(step.id);
        const isActive = step.id === current;
        const isDone = hasResults && stepIdx < currentIdx;
        const isClickable = step.id === 'ingestion' || hasResults;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[#0F766E] text-white'
                  : isDone
                  ? 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                  : 'text-slate-400 cursor-default'
              }`}
            >
              {isDone ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isActive ? 'bg-white/20' : isDone ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  {i + 1}
                </span>
              )}
              {step.label}
            </button>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page config ─────────────────────────────────────────────────── */
const PAGE_INFO: Record<Page, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Audit Overview',
    subtitle: 'Monitor audit results, risk indicators, and anomaly trends',
  },
  clients: {
    title: 'Client Dashboard',
    subtitle: 'Store and manage client data across audit engagements',
  },
  ingestion: {
    title: 'Data Ingestion Workspace',
    subtitle: 'Configure entity and reporting context before ledger upload',
  },
  results: {
    title: 'Suspicious Transactions',
    subtitle: 'Review transactions flagged by rule-based and AI anomaly detection',
  },
  insights: {
    title: 'Insights & Report',
    subtitle: 'AI-generated audit findings, key insights, and downloadable report',
  },
};

/* ─── Main component ──────────────────────────────────────────────── */
export default function AppShell({
  currentUser,
  onLogout,
  initialPage = 'dashboard',
  authToken,
  workbookId,
}: {
  currentUser: string;
  onLogout: () => void;
  initialPage?: Page;
  authToken: string;
  workbookId: string;
}) {
  const [page, setPage] = useState<Page>(initialPage);
  const [file, setFile] = useState<File | null>(null);
  const [sensitivityStep] = useState(2); // fixed default sensitivity
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScrutinyResponse | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [estimatedEntries, setEstimatedEntries] = useState<number | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [entityConfig, setEntityConfig] = useState<WorkbookEntityConfig | null>(null);
  const [workbookDetails, setWorkbookDetails] = useState<Workbook | null>(null);
  const [savingEntityConfig, setSavingEntityConfig] = useState(false);
  const [entityConfigError, setEntityConfigError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkbook = async () => {
      try {
        const workbook = await workbooksApi.getWorkbook(workbookId);
        setEntityConfig(workbook.entity_config ?? null);
        setWorkbookDetails(workbook);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unable to load workbook context.');
      }
    };

    void loadWorkbook();
  }, [authToken, workbookId]);

  const contamination = SENSITIVITY_STEPS[sensitivityStep].value;

  const reviewRows = useMemo(() => results?.review_rows ?? [], [results]);

  const handleAnalyze = async (selectedFile?: File) => {
    const activeFile = selectedFile ?? file;
    if (!activeFile) return;
    if (selectedFile) {
      setFile(selectedFile);
    }
    if (!entityConfig) {
      setError('Complete Entity Configuration before uploading and analyzing ledger data.');
      setPage('ingestion');
      return;
    }
    const estimated = await estimateEntries(activeFile);
    setEstimatedEntries(estimated);

    setLoading(true);
    setError(null);
    setResults(null);
    setApprovalStatus('pending');
    try {
      const data = await workbooksApi.ingestFile(workbookId, activeFile, true, contamination);
      setResults(data);
      setPage('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setEstimatedEntries(null);
    }
  };

  const handleSaveEntityConfig = async (payload: SaveWorkbookEntityConfigPayload) => {
    setSavingEntityConfig(true);
    setEntityConfigError(null);
    try {
      const workbook = await workbooksApi.saveEntityConfig(workbookId, payload);
      setEntityConfig(workbook.entity_config ?? null);
      setWorkbookDetails(workbook);
      setPage('ingestion');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to save entity configuration.';
      setEntityConfigError(message);
    } finally {
      setSavingEntityConfig(false);
    }
  };

  const handleExport = async () => {
    if (!file) return;
    if (approvalStatus !== 'approved') {
      setError('Audit review is pending. Approve suspicious transactions before downloading the report.');
      return;
    }

    setExporting(true);
    try {
      const blob = await scrutinyApi.exportReport(file, true, contamination, true);
      triggerDownload(blob, 'audit_report.xlsx');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const workflowPages: Page[] = ['ingestion', 'results', 'insights'];
  const isWorkflow = workflowPages.includes(page);
  const hideSidebar = page === 'ingestion' || page === 'results' || page === 'insights';

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
        {/* ── Loading overlay ── */}
        {loading && <AnalysisOverlay estimatedEntries={estimatedEntries} />}

        {/* ── Sidebar ── */}
        {!hideSidebar && (
        <aside className="w-60 bg-[#134E4A] min-h-screen flex flex-col fixed top-0 left-0 z-10 shadow-2xl">
          {/* Brand */}
          <div className="px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0F766E] rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/30 flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Ledger Scrutiny</p>
                <p className="text-teal-300/70 text-[10px] mt-0.5 font-medium tracking-wide uppercase">
                  Audit Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-5 px-3 space-y-0.5">
            {/* Workflow section label */}
            <p className="px-3 text-[10px] font-bold text-teal-300/40 uppercase tracking-widest mb-2">
              Workspace
            </p>
            {NAV_ITEMS.filter((n) => !n.workflow).map((item) => (
              <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} />
            ))}

            <div className="my-3 border-t border-white/10" />

            <p className="px-3 text-[10px] font-bold text-teal-300/40 uppercase tracking-widest mb-2">
              Audit Workflow
            </p>
            {NAV_ITEMS.filter((n) => n.workflow).map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={page === item.id}
                onClick={() => setPage(item.id)}
                badge={
                  item.id === 'results' && results
                    ? results.summary.total_flagged.toLocaleString()
                    : undefined
                }
              />
            ))}

          </nav>

          {/* Bottom: status + user */}
          <div className="px-4 pb-4 space-y-3">
            {/* Analysis status */}
            <div className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
              loading
                ? 'bg-teal-600/20 text-teal-200'
                : results
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                loading ? 'bg-teal-400 animate-pulse' : results ? 'bg-emerald-400' : 'bg-slate-500'
              }`} />
              {loading ? 'Analysis running...' : results ? 'Analysis complete' : 'No analysis yet'}
            </div>

            {/* User + dark mode */}
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-lg bg-[#0F766E]/20 border border-teal-400/30 flex items-center justify-center text-teal-300 text-xs font-bold flex-shrink-0">
                {currentUser.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{currentUser}</p>
                <p className="text-slate-500 text-[10px] truncate">Audit Workspace</p>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m-3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                title="Toggle theme"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              >
                {darkMode ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </aside>
        )}

        {/* ── Main content ── */}
        <main className={`flex-1 min-h-screen flex flex-col ${hideSidebar ? 'ml-0' : 'ml-60'}`}>
          {/* Top bar */}
          {!hideSidebar && (
          <header className="bg-white border-b border-slate-200 px-8 py-3.5 sticky top-0 z-[5] shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 leading-none">
                  {PAGE_INFO[page].title}
                </h1>
                <p className="text-xs text-slate-400 mt-1">{PAGE_INFO[page].subtitle}</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Workflow step indicator */}
                {isWorkflow && (
                  <WorkflowSteps current={page} hasResults={!!results} onClick={setPage} />
                )}

                {/* Analysis status chip */}
                {results && !loading && (
                  <span className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {results.summary.total_entries.toLocaleString()} entries
                  </span>
                )}
              </div>
            </div>
          </header>
          )}

          {/* Page content */}
          <div className="flex-1 p-8">
            {/* Error banner */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                <p className="font-semibold text-red-800 mb-2">Error Console</p>
                <div className="flex items-start gap-3">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1 whitespace-pre-wrap">{error}</div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
              </div>
            )}

            {page === 'dashboard' && (
              <DashboardPage
                results={results}
                loading={loading}
                onUploadClick={() => setPage('ingestion')}
                onResultsClick={() => setPage('results')}
              />
            )}
            {page === 'clients' && <ClientDashboardPage />}
            {page === 'ingestion' && (
              <DataIngestionWorkspacePage
                initialConfig={entityConfig}
                saving={savingEntityConfig}
                runningAnalysis={loading}
                error={entityConfigError}
                onSave={handleSaveEntityConfig}
                onRunAnalysis={handleAnalyze}
              />
            )}
            {page === 'results' && (
              <FlaggedTransactionsPage
                results={results}
                reviewRows={reviewRows}
                exporting={exporting}
                approvalStatus={approvalStatus}
                workbookName={workbookDetails?.client_name}
                financialYear={workbookDetails?.financial_year}
                workbookStatus={workbookDetails?.status}
                lastModified={workbookDetails?.last_modified}
                onApprove={() => setApprovalStatus('approved')}
                onReject={() => setApprovalStatus('rejected')}
                onExport={handleExport}
                onUploadClick={() => setPage('ingestion')}
              />
            )}
            {page === 'insights' && (
              <AuditReportPage
                results={results}
                exporting={exporting}
                onUploadClick={() => setPage('ingestion')}
                onExport={handleExport}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Nav button sub-component ────────────────────────────────────── */
function NavButton({
  item,
  active,
  onClick,
  badge,
}: {
  item: (typeof NAV_ITEMS)[0];
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-[#0F766E] text-white shadow-md shadow-teal-600/20'
          : 'text-teal-200/70 hover:bg-white/8 hover:text-white'
      }`}
    >
      {item.icon}
      <span className="flex-1 text-left">{item.label}</span>
      {badge && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}
