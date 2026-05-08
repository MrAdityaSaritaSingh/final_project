import { useState, useRef, useEffect } from 'react';
import Quill from 'quill';
import { escapeHtml, toFileSafeName, downloadBlob } from '../utils';
import { formatNumber } from '@/utils/format';
import type { FlaggedRow } from '@/types/scrutiny';

export function useDocumentationEditor(workbookName: string, financialYear: string, onExport: () => void) {
  const documentationEditorHostRef = useRef<HTMLDivElement | null>(null);
  const documentationQuillRef = useRef<Quill | null>(null);
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const preparedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const [documentationHtml, setDocumentationHtml] = useState<string>(
    () =>
      [
        '<h2>Audit Working Paper - Ledger Scrutiny</h2>',
        `<p>Client: ${escapeHtml(workbookName)}</p>`,
        `<p>Financial Year: ${escapeHtml(financialYear)}</p>`,
        `<p>Prepared by: Auditor Name | Date: ${escapeHtml(preparedDate)}</p>`,
        '<br/>',
        '<h3>Objective</h3>',
        '<p>To identify and document high-risk transactions flagged during general ledger scrutiny analysis.</p>',
        '<br/>',
        '<h3>Scope</h3>',
        `<p>Review of general ledger transactions for the period ${escapeHtml(financialYear)}.</p>`,
        '<br/>',
        '<h3>Findings</h3>',
        '<p>Insert evidence below to document specific transactions requiring attention.</p>',
      ].join(''),
  );
  const [insertedEvidenceIds, setInsertedEvidenceIds] = useState<string[]>([]);

  useEffect(() => {
    const host = documentationEditorHostRef.current;
    if (!host || documentationQuillRef.current) return;

    const quill = new Quill(host, {
      theme: 'snow',
      modules: { toolbar: false },
    });

    documentationQuillRef.current = quill;
    quill.clipboard.dangerouslyPasteHTML(documentationHtml, 'silent');

    quill.on('text-change', () => {
      setDocumentationHtml(quill.root.innerHTML);
    });
  }, [documentationHtml]);

  useEffect(() => {
    const quill = documentationQuillRef.current;
    if (!quill) return;

    if (quill.root.innerHTML !== documentationHtml) {
      const currentSelection = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(documentationHtml, 'silent');
      if (currentSelection) {
        quill.setSelection(currentSelection.index, currentSelection.length, 'silent');
      }
    }
  }, [documentationHtml]);

  const insertEvidenceToDocument = (row: FlaggedRow, rowIndex: number) => {
    const evidenceId = `${row.voucher_no || 'voucher'}-${row.date || 'date'}-${rowIndex}`;

    const evidenceHtml = [
      '<p><strong>Evidence</strong></p>',
      `<p>Date: ${escapeHtml(row.date || '-')}</p>`,
      `<p>Journal ID: ${escapeHtml(row.voucher_no || '-')}</p>`,
      `<p>Account: ${escapeHtml(row.ledger_name || '-')}</p>`,
      `<p>Amount: Rs.${escapeHtml(formatNumber(Math.abs(Number(row.amount) || 0)))}</p>`,
      `<p>Category: ${escapeHtml(row.scrutiny_category || '-')}</p>`,
      '<br/>',
    ].join('');

    setDocumentationHtml((prev) => `${prev}${evidenceHtml}`);
    setInsertedEvidenceIds((prev) => (prev.includes(evidenceId) ? prev : [...prev, evidenceId]));
  };

  const getQuill = () => documentationQuillRef.current;

  const ensureQuillSelection = () => {
    const quill = getQuill();
    if (!quill) return null;

    const current = quill.getSelection();
    if (current) {
      return current;
    }

    const length = quill.getLength();
    quill.setSelection(Math.max(0, length - 1), 0, 'silent');
    return quill.getSelection();
  };

  const syncDocumentationFromQuill = () => {
    const quill = getQuill();
    if (!quill) return;
    setDocumentationHtml(quill.root.innerHTML);
  };

  const applyInlineFormat = (format: 'bold' | 'italic' | 'underline') => {
    const quill = getQuill();
    const range = ensureQuillSelection();
    if (!quill || !range) return;

    const current = quill.getFormat(range.index, range.length);
    const nextValue = !Boolean(current[format]);
    quill.format(format, nextValue, 'user');
    syncDocumentationFromQuill();
  };

  const applyListFormat = (listType: 'ordered' | 'bullet') => {
    const quill = getQuill();
    const range = ensureQuillSelection();
    if (!quill || !range) return;

    const current = quill.getFormat(range.index, range.length);
    const nextValue = current.list === listType ? false : listType;
    quill.formatLine(range.index, Math.max(range.length, 1), 'list', nextValue, 'user');
    syncDocumentationFromQuill();
  };

  const applyHeading2 = () => {
    const quill = getQuill();
    const range = ensureQuillSelection();
    if (!quill || !range) return;

    const current = quill.getFormat(range.index, range.length);
    const nextValue = current.header === 2 ? false : 2;
    quill.formatLine(range.index, Math.max(range.length, 1), 'header', nextValue, 'user');
    syncDocumentationFromQuill();
  };

  const handleExportDoc = () => {
    const safeWorkbook = toFileSafeName(workbookName || 'workbook');
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Audit Working Paper</title>
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.55; }
            h1 { font-size: 20pt; margin-bottom: 12px; }
            p { margin: 0 0 8px 0; }
            pre { white-space: pre-wrap; font-family: Calibri, Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h1>Audit Working Paper - Ledger Scrutiny</h1>
          ${documentationHtml}
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    downloadBlob(blob, `${safeWorkbook}_audit_working_paper.doc`);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const safeWorkbook = toFileSafeName(workbookName || 'workbook');

    try {
      const jspdfModule = await import('jspdf');
      const doc = new jspdfModule.jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 40;
      const marginY = 40;
      const lineHeight = 18;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      const plainText = (documentationQuillRef.current?.getText() || '').trim();
      const lines = doc.splitTextToSize(plainText, pageWidth - marginX * 2);
      let currentY = marginY;

      for (const line of lines) {
        if (currentY > pageHeight - marginY) {
          doc.addPage();
          currentY = marginY;
        }
        doc.text(String(line), marginX, currentY);
        currentY += lineHeight;
      }

      doc.save(`${safeWorkbook}_audit_working_paper.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      onExport();
    } finally {
      setExporting(false);
    }
  };

  return {
    documentationEditorHostRef,
    documentationHtml,
    insertedEvidenceIds,
    insertEvidenceToDocument,
    applyInlineFormat,
    applyListFormat,
    applyHeading2,
    handleExportDoc,
    handleExportPdf,
    exporting,
  };
}
