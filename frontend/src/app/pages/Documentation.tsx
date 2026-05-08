import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Underline, List, ListOrdered, Heading2, FileDown, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { scrutinyApi } from '../../api/scrutinyApi';

interface Evidence {
  id: string;
  date: string;
  voucherNo: string;
  account: string;
  amount: string;
  scrutinyCategory: string;
  narration: string;
}

export default function Documentation() {
  const [evidenceList] = useState<Evidence[]>([
    {
      id: '1',
      date: '2025-04-15',
      voucherNo: 'JV-001234',
      account: 'Office Rent - 5100',
      amount: '₹5,50,000',
      scrutinyCategory: 'Round Numbers',
      narration: 'Monthly office rent payment'
    },
    {
      id: '2',
      date: '2025-04-20',
      voucherNo: 'PV-002456',
      account: 'Marketing Expense - 5200',
      amount: '₹7,25,000',
      scrutinyCategory: 'Weak Narration',
      narration: 'Digital advertising campaign'
    }
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: `
      <h2>Audit Working Paper — Ledger Scrutiny</h2>
      <p>Client: Acme Corporation Ltd.</p>
      <p>Financial Year: FY 2023-24</p>
      <p>Prepared by: Auditor Name | Date: ${new Date().toLocaleDateString()}</p>
      <br/>
      <h3>Objective</h3>
      <p>To identify and document high-risk transactions flagged during general ledger scrutiny analysis.</p>
      <br/>
      <h3>Scope</h3>
      <p>Review of general ledger transactions for the period April 2023 to March 2024.</p>
      <br/>
      <h3>Findings</h3>
      <p>Insert evidence below to document specific transactions requiring attention.</p>
      <br/>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[600px] p-8',
      },
    },
  });

  const insertEvidence = (evidence: Evidence) => {
    if (!editor) return;

    const content = `
      <p><strong>Transaction Reference:</strong> ${evidence.voucherNo}</p>
      <p><strong>Date:</strong> ${evidence.date}</p>
      <p><strong>Account:</strong> ${evidence.account}</p>
      <p><strong>Amount:</strong> ${evidence.amount}</p>
      <p><strong>Triggered Controls:</strong> ${evidence.scrutinyCategory}</p>
      <p><strong>Narration:</strong> "${evidence.narration}"</p>
      <br/>
    `;

    editor.chain().focus().insertContent(content).run();
    toast.success('Evidence inserted into document');
  };

  const handleExportPDF = async () => {
    if (!selectedFile) {
      toast.error('Please upload a file first');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await scrutinyApi.exportReport(selectedFile, true, 0.05, true);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'scrutiny_report.xlsx';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Report exported as Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = () => {
    if (!editor) {
      toast.error('Document is empty');
      return;
    }

    try {
      // Get HTML from editor
      const html = editor.getHTML();
      
      // Create a simple DOCX using HTML (would need a library like docx for full support)
      const doc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
              h2 { color: #095859; }
              h3 { color: #0B6B6A; margin-top: 20px; }
              p { margin: 5px 0; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `;

      const blob = new Blob([doc], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit_working_paper.docx';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success('Document exported as DOCX');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export document');
    }
  };

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* Left side - Rich Text Editor (70%) */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        {/* Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-1 border-r border-gray-300 pr-4">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('bold') ? 'bg-gray-200' : ''
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('italic') ? 'bg-gray-200' : ''
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('strike') ? 'bg-gray-200' : ''
              }`}
              title="Strikethrough"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-gray-300 pr-4">
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('bulletList') ? 'bg-gray-200' : ''
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('orderedList') ? 'bg-gray-200' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
              }`}
              title="Heading"
            >
              <Heading2 className="w-4 h-4" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500">
              {selectedFile ? `File: ${selectedFile.name}` : 'No file selected'}
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              id="fileInput"
              accept=".csv,.xlsx,.xls"
            />
            <button
              onClick={() => document.getElementById('fileInput')?.click()}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Choose File
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1.5 text-sm bg-[#095859] text-white rounded hover:bg-[#0B6B6A] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Export as Excel
            </button>
            <button
              onClick={handleExportDOCX}
              className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export as DOCX
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto bg-white">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Right side - Evidence Panel (30%) */}
      <div className="w-[400px] flex flex-col bg-gray-50">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h3 className="text-sm text-gray-900">Selected Evidence</h3>
          <p className="text-xs text-gray-500 mt-1">
            {evidenceList.length} transaction{evidenceList.length !== 1 ? 's' : ''} added
          </p>
        </div>

        {/* Evidence List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {evidenceList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No evidence added yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add transactions from the Investigation tab
              </p>
            </div>
          ) : (
            evidenceList.map((evidence) => (
              <div
                key={evidence.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-2 mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="text-sm text-gray-900">{evidence.date}</div>
                    </div>
                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                      {evidence.scrutinyCategory}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Journal ID</div>
                    <div className="text-sm text-gray-900 font-mono">{evidence.voucherNo}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Account</div>
                    <div className="text-sm text-gray-900">{evidence.account}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="text-sm text-gray-900 font-medium">{evidence.amount}</div>
                  </div>
                </div>

                <button
                  onClick={() => insertEvidence(evidence)}
                  className="w-full px-3 py-2 text-sm bg-[#095859] text-white rounded hover:bg-[#0B6B6A] transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Insert into Document
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}