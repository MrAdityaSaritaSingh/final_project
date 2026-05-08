import React, { useState } from 'react';
import type { InvestigationWorkspaceState } from './types';
import { toText } from './utils';
import { InvestigationSidebar } from './InvestigationSidebar';

interface Props {
  investigationTabs: InvestigationWorkspaceState[];
  activeInvestigationTabId: string;
  setActiveInvestigationTabId: (id: string) => void;
  activeInvestigationTab: InvestigationWorkspaceState;
  investigationRows: Record<string, unknown>[];
  reviewColumns: string[];
  addInvestigationTab: () => void;
  startRenameTab: (tabId: string) => void;
  commitRenameTab: () => void;
  cancelRenameTab: () => void;
  renamingTabId: string | null;
  renameTabValue: string;
  setRenameTabValue: (val: string) => void;
  updateActiveInvestigationTab: (updater: (current: InvestigationWorkspaceState) => InvestigationWorkspaceState) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  updateMultiSelect: (bucket: 'voucherTypes' | 'currencies', value: string, checked: boolean) => void;
}

export function InvestigationTab({
  investigationTabs,
  activeInvestigationTabId,
  setActiveInvestigationTabId,
  activeInvestigationTab,
  investigationRows,
  reviewColumns,
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
}: Props) {
  const [showFilters, setShowFilters] = useState(true);
  const visibleColumns = reviewColumns.slice(0, 8);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex min-h-[66vh]">
        {showFilters && (
          <InvestigationSidebar
            activeTab={activeInvestigationTab}
            updateActiveTab={updateActiveInvestigationTab}
            onHide={() => setShowFilters(false)}
            onApply={applyFilters}
            onReset={resetFilters}
            updateMultiSelect={updateMultiSelect}
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {!showFilters && (
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
              <button className="text-sm text-blue-600" onClick={() => setShowFilters(true)}>
                Show filters
              </button>
            </div>
          )}

          <div className="px-4 pt-2 border-b border-slate-200 flex items-center gap-2">
            {investigationTabs.map((workspace) => (
              <div key={workspace.id} className="flex items-center gap-1">
                {renamingTabId === workspace.id ? (
                  <input
                    autoFocus
                    className="px-3 py-1.5 text-sm border border-blue-300 rounded-md min-w-[140px]"
                    value={renameTabValue}
                    onChange={(e) => setRenameTabValue(e.target.value)}
                    onBlur={commitRenameTab}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitRenameTab();
                      }
                      if (e.key === 'Escape') {
                        cancelRenameTab();
                      }
                    }}
                  />
                ) : (
                  <button
                    className={`px-4 py-2 border-b-2 text-sm ${
                      workspace.id === activeInvestigationTabId
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500'
                    }`}
                    onClick={() => {
                      if (workspace.id === activeInvestigationTabId) {
                        startRenameTab(workspace.id);
                      } else {
                        setActiveInvestigationTabId(workspace.id);
                      }
                    }}
                  >
                    {workspace.label}
                  </button>
                )}
              </div>
            ))}
            <button
              className="text-slate-500 text-sm font-semibold px-3 py-1.5 border border-slate-200 rounded-lg hover:text-slate-700 hover:border-slate-300"
              aria-label="Add tab"
              onClick={addInvestigationTab}
            >
              + New Tab
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {investigationRows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <p className="text-3xl text-slate-300 mb-2">No transactions to display</p>
                <p className="text-2xl">
                  {activeInvestigationTab?.hasRequested
                    ? 'No rows matched this tab filters/query. Try different criteria.'
                    : 'Enter a query below or apply filters to view data'}
                </p>
              </div>
            ) : (
              <table className="w-full min-w-max text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    {(visibleColumns.length > 0 ? visibleColumns : ['No Data']).map((column) => (
                      <th key={column} className="px-4 py-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investigationRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      {visibleColumns.map((column) => (
                        <td key={`${idx}-${column}`} className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                          {toText(row[column]) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              className="flex-1 border-2 border-[#0F766E] rounded-2xl px-4 py-2.5 text-sm"
              placeholder="List round-value transactions above Rs.1,00,000"
              value={activeInvestigationTab?.queryInput ?? ''}
              onChange={(e) =>
                updateActiveInvestigationTab((current) => ({
                  ...current,
                  queryInput: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateActiveInvestigationTab((current) => ({
                    ...current,
                    appliedQuery: current.queryInput,
                    hasRequested: true,
                  }));
                }
              }}
            />
            <button
              className="rounded-2xl bg-[#0F766E] text-white font-semibold px-5 py-2.5"
              onClick={() =>
                updateActiveInvestigationTab((current) => ({
                  ...current,
                  appliedQuery: activeInvestigationTab.queryInput,
                  hasRequested: true,
                }))
              }
            >
              Run Query
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
