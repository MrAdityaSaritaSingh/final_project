import React from 'react';
import type { FlaggedRow } from '@/types/scrutiny';
import { formatNumber } from '@/utils/format';
import { splitCategories, toText } from './utils';

interface Props {
  documentationEditorHostRef: React.RefObject<HTMLDivElement | null>;
  insertedEvidenceIds: string[];
  insertEvidenceToDocument: (row: FlaggedRow, index: number) => void;
  applyInlineFormat: (format: 'bold' | 'italic' | 'underline') => void;
  applyListFormat: (listType: 'ordered' | 'bullet') => void;
  applyHeading2: () => void;
  handleExportDoc: () => void;
  handleExportPdf: () => void;
  exporting: boolean;
  flaggedRows: FlaggedRow[];
}

export function DocumentationTab({
  documentationEditorHostRef,
  insertedEvidenceIds,
  insertEvidenceToDocument,
  applyInlineFormat,
  applyListFormat,
  applyHeading2,
  handleExportDoc,
  handleExportPdf,
  exporting,
  flaggedRows,
}: Props) {
  const anomalyEvidenceRows = [...flaggedRows].sort(
    (a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0),
  );

  const handleToolbarMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Keep Quill selection stable while clicking custom toolbar buttons.
    event.preventDefault();
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="border-r border-slate-200 min-w-0">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div className="flex items-center gap-2 text-slate-700">
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={() => applyInlineFormat('bold')}
                className="h-9 w-9 rounded-md border border-slate-300 bg-white text-base font-semibold"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={() => applyInlineFormat('italic')}
                className="h-9 w-9 rounded-md border border-slate-300 bg-white text-base italic"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={() => applyInlineFormat('underline')}
                className="h-9 w-9 rounded-md border border-slate-300 bg-white text-base underline"
              >
                U
              </button>
              <span className="h-6 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={() => applyListFormat('ordered')}
                className="h-9 w-9 rounded-md border border-slate-300 bg-white text-sm"
              >
                1.
              </button>
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={() => applyListFormat('bullet')}
                className="h-9 w-9 rounded-md border border-slate-300 bg-white text-sm"
              >
                -
              </button>
              <span className="h-6 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                onMouseDown={handleToolbarMouseDown}
                onClick={applyHeading2}
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-semibold"
              >
                H2
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-base font-semibold disabled:opacity-50"
              >
                {exporting ? 'Generating...' : 'Export as PDF'}
              </button>
              <button
                onClick={handleExportDoc}
                disabled={exporting}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-base font-semibold disabled:opacity-50"
              >
                Export as DOC
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="documentation-quill">
              <div ref={documentationEditorHostRef} />
            </div>
          </div>
        </div>

        <aside className="bg-[#f8fafc]">
          <div className="px-4 py-4 border-b border-slate-200">
            <h4 className="text-2xl font-semibold text-slate-900">Selected Evidence</h4>
            <p className="text-lg text-slate-500 mt-1">{insertedEvidenceIds.length} transactions added</p>
          </div>

          <div className="p-4 space-y-3 max-h-[700px] overflow-y-auto">
            {anomalyEvidenceRows.map((row, index) => {
              const evidenceId = `${row.voucher_no || 'voucher'}-${row.date || 'date'}-${index}`;
              const alreadyAdded = insertedEvidenceIds.includes(evidenceId);

              return (
                <article key={evidenceId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm text-slate-500">Date</p>
                      <p className="text-2xl font-medium text-slate-800">{row.date || '-'}</p>
                    </div>
                    <span className="text-sm px-3 py-1 rounded-lg bg-amber-100 text-amber-800">
                      {splitCategories(toText(row.scrutiny_category))[0] || 'Flagged'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-sm text-slate-500">Journal ID</p>
                      <p className="text-xl font-medium text-slate-800">{row.voucher_no || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account</p>
                      <p className="text-xl font-medium text-slate-800">{row.ledger_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Amount</p>
                      <p className="text-3xl font-semibold text-slate-900">
                        Rs.{formatNumber(Math.abs(Number(row.amount) || 0))}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => insertEvidenceToDocument(row, index)}
                    className={`w-full rounded-lg px-4 py-2.5 text-base font-semibold ${
                      alreadyAdded ? 'bg-slate-200 text-slate-600' : 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                    }`}
                  >
                    {alreadyAdded ? 'Added to Document' : 'Insert into Document'}
                  </button>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
