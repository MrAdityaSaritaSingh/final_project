import { useState } from 'react';
import 'quill/dist/quill.snow.css';

import type { ScrutinyResponse } from '@/types/scrutiny';

import { OverviewTab } from '@/components/flagged-transactions/OverviewTab';
import { InvestigationTab } from '@/components/flagged-transactions/InvestigationTab';
import { DocumentationTab } from '@/components/flagged-transactions/DocumentationTab';
import { useInvestigationWorkspace } from '@/components/flagged-transactions/hooks/useInvestigationWorkspace';
import { useDocumentationEditor } from '@/components/flagged-transactions/hooks/useDocumentationEditor';
import { initials, formatShortDate } from '@/components/flagged-transactions/utils';
import { TabButton } from '@/components/flagged-transactions/ui';
import type { WorkspaceTab, ApprovalStatus } from '@/components/flagged-transactions/types';

interface Props {
  results: ScrutinyResponse | null;
  reviewRows: Record<string, unknown>[];
  exporting: boolean;
  approvalStatus: ApprovalStatus;
  workbookName?: string;
  financialYear?: string;
  workbookStatus?: string;
  lastModified?: string;
  onApprove: () => void;
  onReject: () => void;
  onExport: () => void;
  onUploadClick: () => void;
}

export default function FlaggedTransactionsPage({
  results,
  reviewRows,
  exporting: globalExporting,
  approvalStatus,
  workbookName = 'Workbook',
  financialYear = '-',
  workbookStatus = 'In Progress',
  lastModified,
  onApprove,
  onReject,
  onExport,
  onUploadClick,
}: Props) {
  void approvalStatus;
  void onApprove;
  void onReject;

  const [tab, setTab] = useState<WorkspaceTab>('overview');

  const {
    investigationTabs,
    activeInvestigationTabId,
    setActiveInvestigationTabId,
    activeInvestigationTab,
    investigationRows,
    addInvestigationTab,
    startRenameTab,
    commitRenameTab,
    cancelRenameTab,
    renamingTabId,
    renameTabValue,
    setRenameTabValue,
    updateActiveInvestigationTab,
    applyFilters,
    resetFilters,
    updateMultiSelect,
  } = useInvestigationWorkspace(reviewRows, results?.summary?.total_entries);

  const {
    documentationEditorHostRef,
    insertedEvidenceIds,
    insertEvidenceToDocument,
    applyInlineFormat,
    applyListFormat,
    applyHeading2,
    handleExportDoc,
    handleExportPdf,
    exporting: docExporting,
  } = useDocumentationEditor(workbookName, financialYear, onExport);

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">No Analysis Yet</h2>
        <p className="text-slate-500 mb-5">Run risk analysis to generate workbook overview.</p>
        <button
          onClick={onUploadClick}
          className="px-5 py-2.5 bg-[#0F766E] text-white rounded-xl text-sm font-semibold hover:bg-[#115E59]"
        >
          Upload General Ledger
        </button>
      </div>
    );
  }

  const reviewColumns = reviewRows.length > 0 ? Object.keys(reviewRows[0]) : [];

  return (
    <div className="bg-[#f8fafc] min-h-[80vh] border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <button
          className="text-slate-600 text-xl font-medium flex items-center gap-2 hover:text-slate-900"
          onClick={onUploadClick}
        >
          <span>‹</span>
          <span>Back to Workbooks</span>
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <p className="text-4xl font-semibold text-slate-900">{workbookName}</p>
            <span className="text-slate-400">|</span>
            <p className="text-3xl">{financialYear}</p>
            <span className="text-slate-400">|</span>
            <span className="text-lg rounded-md px-3 py-1 bg-blue-100 text-blue-700">{workbookStatus}</span>
            <span className="text-slate-400">|</span>
            <p className="text-2xl text-slate-500">{formatShortDate(lastModified)}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {initials('Auditor User')}
            </span>
            <span className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
              JD
            </span>
            <span className="text-sm text-slate-500 ml-1">Collaborators</span>
          </div>
        </div>
      </div>

      <div className="px-6 pt-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-8 text-lg font-medium">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" />
          <TabButton
            active={tab === 'investigation'}
            onClick={() => setTab('investigation')}
            label="Investigation"
          />
          <TabButton
            active={tab === 'documentation'}
            onClick={() => setTab('documentation')}
            label="Documentation"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {tab === 'overview' && (
          <OverviewTab
            results={results}
            onReviewSource={() => setTab('investigation')}
            onReplaceDataset={onUploadClick}
          />
        )}

        {tab === 'investigation' && (
          <InvestigationTab
            investigationTabs={investigationTabs}
            activeInvestigationTabId={activeInvestigationTabId}
            setActiveInvestigationTabId={setActiveInvestigationTabId}
            activeInvestigationTab={activeInvestigationTab}
            investigationRows={investigationRows}
            reviewColumns={reviewColumns}
            addInvestigationTab={addInvestigationTab}
            startRenameTab={startRenameTab}
            commitRenameTab={commitRenameTab}
            cancelRenameTab={cancelRenameTab}
            renamingTabId={renamingTabId}
            renameTabValue={renameTabValue}
            setRenameTabValue={setRenameTabValue}
            updateActiveInvestigationTab={updateActiveInvestigationTab}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            updateMultiSelect={updateMultiSelect}
          />
        )}

        {tab === 'documentation' && (
          <DocumentationTab
            documentationEditorHostRef={documentationEditorHostRef}
            insertedEvidenceIds={insertedEvidenceIds}
            insertEvidenceToDocument={insertEvidenceToDocument}
            applyInlineFormat={applyInlineFormat}
            applyListFormat={applyListFormat}
            applyHeading2={applyHeading2}
            handleExportDoc={handleExportDoc}
            handleExportPdf={handleExportPdf}
            exporting={globalExporting || docExporting}
            flaggedRows={results.flagged_rows}
          />
        )}
      </div>
    </div>
  );
}
