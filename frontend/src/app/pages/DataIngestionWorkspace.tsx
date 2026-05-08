import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { workbooksApi } from '../../api/workbooksApi';
import { useWorkbook } from '../context/WorkbookContext';

interface ColumnMapping {
  systemField: string;
  mappedColumn: string;
  required: boolean;
}

export default function DataIngestionWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workbookId = searchParams.get('workbookId');
  const isReplaceMode = searchParams.get('mode') === 'replace';
  const { setWorkbookData } = useWorkbook();

  // Workflow state
  const [entityConfigComplete, setEntityConfigComplete] = useState(false);
  const [dataIngested, setDataIngested] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Entity Configuration
  const [entityName, setEntityName] = useState(isReplaceMode ? 'Acme Corporation Ltd.' : '');
  const [financialYear, setFinancialYear] = useState(isReplaceMode ? '2023-2024' : '');
  const [ledgerType, setLedgerType] = useState(isReplaceMode ? 'general' : '');
  const [functionalCurrency, setFunctionalCurrency] = useState(isReplaceMode ? 'INR' : '');
  const [reportingCurrency, setReportingCurrency] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  // File Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [headerRowPosition, setHeaderRowPosition] = useState('1');

  // Column Mapping
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([
    { systemField: 'Date', mappedColumn: '', required: true },
    { systemField: 'Journal ID', mappedColumn: '', required: true },
    { systemField: 'Account Name', mappedColumn: '', required: true },
    { systemField: 'Debit', mappedColumn: '', required: true },
    { systemField: 'Credit', mappedColumn: '', required: true },
    { systemField: 'Narration', mappedColumn: '', required: true },
    { systemField: 'User ID', mappedColumn: '', required: false },
    { systemField: 'Currency', mappedColumn: '', required: false },
    { systemField: 'Cost Center', mappedColumn: '', required: false },
  ]);

  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Preview data from schema preview
  const previewData: any[] = [];
  const [parsedCsvData, setParsedCsvData] = useState<any[]>([]);

  // Data Health Metrics from real analysis
  const [dataMetrics, setDataMetrics] = useState({
    totalTransactions: 0,
    totalDebit: '₹0',
    totalCredit: '₹0',
    dateRange: '—',
    missingNarrations: 0,
    duplicateJournalIds: 0,
    unbalancedEntries: 0,
    manualEntries: 0,
  });

  useEffect(() => {
    if (!workbookId && !isReplaceMode) {
      toast.error('No workbook selected. Please create a workbook first.');
      navigate('/home');
    }
  }, [workbookId, isReplaceMode, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    try {
      let headers: string[] = [];
      let rows: any[] = [];

      // Detect file type and parse accordingly
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length === 0) {
          toast.error('Excel file is empty');
          return;
        }

        headers = (data[0] as string[]).map(h => String(h || '').trim());
        rows = (data.slice(1, 21) as any[][]).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      } else {
        // Parse CSV file using PapaParse
        const text = await file.text();
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          transformHeader: (h: string) => h.trim(),
        });

        if (!parseResult.data || parseResult.data.length === 0) {
          toast.error('CSV file is empty or invalid');
          return;
        }

        headers = parseResult.meta.fields || [];
        rows = (parseResult.data.slice(0, 20) as any[]);
      }

      if (headers.length === 0) {
        toast.error('No columns found in file');
        return;
      }

      setParsedCsvData(rows);
      setAvailableColumns(headers);

      // Store in context for client-side processing
      if (workbookId) {
        setWorkbookData({
          columnMappings: {},
          workbookId,
        });
      }

      // Auto-map columns based on fuzzy matching
      const mappings: Record<string, string> = {};
      columnMappings.forEach(mapping => {
        const systemField = mapping.systemField.toLowerCase().replace(' ', '_');
        const matchedColumn = headers.find(col =>
          col.toLowerCase().includes(systemField) ||
          systemField.includes(col.toLowerCase().replace(' ', '_'))
        );
        if (matchedColumn) {
          mappings[mapping.systemField] = matchedColumn;
        }
      });

      setColumnMappings(prev =>
        prev.map(m => ({
          ...m,
          mappedColumn: mappings[m.systemField] || '',
        }))
      );

      toast.success(`Loaded ${rows.length} rows with ${headers.length} columns`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const getMappedPreviewData = () => {
    if (parsedCsvData.length === 0) return previewData.slice(0, 10);

    return parsedCsvData.slice(0, 10).map(row => {
      const mappedRow: any = {};
      columnMappings.forEach(mapping => {
        if (mapping.mappedColumn && row[mapping.mappedColumn] !== undefined) {
          mappedRow[mapping.systemField] = row[mapping.mappedColumn];
        } else {
          mappedRow[mapping.systemField] = '';
        }
      });
      return mappedRow;
    });
  };

  const getPreviewHeaders = () => {
    return columnMappings
      .filter(m => m.mappedColumn) // Only show mapped columns
      .map(m => m.systemField);
  };

  const handleMappingChange = (index: number, value: string) => {
    const updated = [...columnMappings];
    updated[index].mappedColumn = value;
    setColumnMappings(updated);

    // Update context with current mappings
    if (workbookId) {
      const mappings = updated.reduce((acc, m) => {
        if (m.mappedColumn) acc[m.systemField] = m.mappedColumn;
        return acc;
      }, {} as Record<string, string>);

      setWorkbookData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          columnMappings: mappings,
        };
      });
    }
  };

  const handleReset = () => {
    setEntityName('');
    setFinancialYear('');
    setLedgerType('');
    setFunctionalCurrency('');
    setReportingCurrency('');
    setCompanyCode('');
    setUploadedFile(null);
    setHeaderRowPosition('1');
    setColumnMappings(columnMappings.map(m => ({ ...m, mappedColumn: '' })));
    setDataIngested(false);
    setAnalysisResult(null);
    setEntityConfigComplete(false);
  };

  const isEntityConfigValid = () => {
    return (
      entityName.trim().length >= 2 &&
      financialYear.trim().length >= 4 &&
      ledgerType.trim().length >= 2 &&
      functionalCurrency.trim().length >= 2
    );
  };

  const isMappingValid = () => {
    return columnMappings
      .filter(m => m.required)
      .every(m => m.mappedColumn.trim().length > 0);
  };

  const isReadyForAnalysis = () => {
    return !!uploadedFile && isEntityConfigValid() && isMappingValid();
  };

  const handleRunAnalysis = async () => {
    if (!isReadyForAnalysis() || !workbookId) return;

    setIsAnalyzing(true);
    try {
      // First save entity config
      await workbooksApi.saveEntityConfig(workbookId, {
        entity_name: entityName,
        financial_year: financialYear,
        ledger_type: ledgerType,
        functional_currency: functionalCurrency,
        reporting_currency: reportingCurrency || undefined,
        company_code: companyCode || undefined,
        header_row: parseInt(headerRowPosition),
        column_mappings: columnMappings.reduce((acc, m) => {
          if (m.mappedColumn) acc[m.systemField] = m.mappedColumn;
          return acc;
        }, {} as Record<string, string>),
      });

      // Then ingest and analyze
      const result = await workbooksApi.ingestFile(workbookId, uploadedFile!, true, 0.05);
      setAnalysisResult(result);

      const summary = result?.summary || {};
      const health = result?.health_summary || summary?.health_summary || {};

      setDataMetrics({
        totalTransactions: summary.total_entries || health.total_transactions || 0,
        totalDebit: health.total_debit
          ? `₹${Number(health.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '₹0.00',
        totalCredit: health.total_credit
          ? `₹${Number(health.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '₹0.00',
        dateRange: health.date_from && health.date_to ? `${health.date_from} – ${health.date_to}` : '—',
        missingNarrations: health.missing_narrations || 0,
        duplicateJournalIds: health.duplicate_journal_ids || 0,
        unbalancedEntries: health.unbalanced_entries || 0,
        manualEntries: health.manual_entries || 0,
      });

      setDataIngested(true);
      toast.success('Analysis complete');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      if (error.message === 'Invalid or expired token') {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }
      toast.error(error?.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNavigateToWorkbook = () => {
    if (workbookId) {
      navigate(`/workbook/${workbookId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-8 py-5">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-xl text-gray-900">Data Ingestion Workspace</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8">

        {/* SECTION A: Entity Configuration */}
        <div className="bg-white border border-gray-300 p-8">
          <div className="mb-6">
            <h2 className="text-base text-gray-900 mb-1">1. Entity Configuration</h2>
            <p className="text-sm text-gray-600">Define the financial and reporting context for this ledger.</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Entity Name</label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                placeholder="Enter entity name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Financial Year</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              >
                <option value="">Select financial year</option>
                <option value="2024-2025">April 2024 - March 2025</option>
                <option value="2023-2024">April 2023 - March 2024</option>
                <option value="2022-2023">April 2022 - March 2023</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Ledger Type</label>
              <select
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              >
                <option value="">Select ledger type</option>
                <option value="general">General Ledger</option>
                <option value="sub">Sub-ledger</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Functional Currency</label>
              <select
                value={functionalCurrency}
                onChange={(e) => setFunctionalCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              >
                <option value="">Select currency</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Reporting Currency (Optional)</label>
              <select
                value={reportingCurrency}
                onChange={(e) => setReportingCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              >
                <option value="">Select currency</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Company Code / Subsidiary (Optional)</label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                placeholder="Enter company code"
              />
            </div>
          </div>

          {!entityConfigComplete && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  if (isEntityConfigValid()) {
                    setEntityConfigComplete(true);
                  } else {
                    toast.error('Please fill all required entity configuration fields correctly.');
                  }
                }}
                disabled={!isEntityConfigValid()}
                className="px-6 py-2.5 text-sm bg-[#095859] text-white hover:bg-[#0B6B6A] transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Upload Ledger
              </button>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        {entityConfigComplete && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Step 1: Entity Configured</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${dataIngested ? 'border-green-600 bg-green-600' : 'border-gray-400'}`}>
                {dataIngested && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className="text-gray-900">Step 2: Upload & Map Ledger</span>
            </div>
          </div>
        )}

        {/* SECTION B: File Upload & Mapping */}
        {entityConfigComplete && (
          <div className="bg-white border border-gray-300 p-8">
            <div className="mb-6">
              <h2 className="text-base text-gray-900 mb-1">2. File Upload & Mapping</h2>
              <p className="text-sm text-gray-600">Upload ledger file and map required fields before analysis.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div
                  className={`border-2 border-dashed ${uploadedFile ? 'border-gray-400 bg-gray-50' : 'border-gray-300'} p-8 text-center transition-colors`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {uploadedFile ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                      <p className="text-sm text-gray-900 mb-1">File selected</p>
                      <p className="text-xs text-gray-600">{uploadedFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-gray-700 mb-1">Upload CSV or Excel file</p>
                      <p className="text-xs text-gray-500">Supported formats: .csv, .xlsx</p>
                    </>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="mt-4 px-4 py-2 text-xs bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {uploadedFile ? 'Change File' : 'Select File'}
                  </button>
                </div>
              </div>

              {!dataIngested && (
                <div className="bg-gray-50 border border-gray-300 p-6 flex items-center justify-center">
                  <button
                    onClick={() => setDataIngested(true)}
                    disabled={!uploadedFile}
                    className="px-6 py-2.5 text-sm bg-[#095859] text-white hover:bg-[#0B6B6A] transition-colors disabled:bg-[#A7C7C6] disabled:cursor-not-allowed rounded-lg"
                  >
                    Ingest Data
                  </button>
                </div>
              )}

              {dataIngested && uploadedFile && (
                <div className="bg-gray-50 border border-gray-300 p-6">
                  <h3 className="text-sm text-gray-900 mb-4">File Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Name:</span>
                      <span className="text-gray-900">{uploadedFile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="text-gray-900">{(uploadedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rows Detected:</span>
                      <span className="text-gray-900">{analysisResult?.summary?.total_entries?.toLocaleString() || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Columns Detected:</span>
                      <span className="text-gray-900">{availableColumns.length || 9}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {dataIngested && uploadedFile && (
              <>
                <div className="mb-6">
                  <label className="block text-sm text-gray-700 mb-2">Header Row Position</label>
                  <select
                    value={headerRowPosition}
                    onChange={(e) => setHeaderRowPosition(e.target.value)}
                    className="w-64 px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  >
                    <option value="1">Row 1</option>
                    <option value="2">Row 2</option>
                    <option value="3">Row 3</option>
                  </select>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm text-gray-900 mb-3">Column Mapping</h3>
                  <div className="border border-gray-300">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs text-gray-700 border-b border-gray-300">System Field</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-700 border-b border-gray-300">Mapped Column</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columnMappings.map((mapping, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {mapping.systemField}
                              {mapping.required && <span className="text-red-600 ml-1">*</span>}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={mapping.mappedColumn}
                                onChange={(e) => handleMappingChange(index, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                              >
                                <option value="">Select column</option>
                                {availableColumns.map((col, idx) => (
                                  <option key={idx} value={col}>{col}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {parsedCsvData.length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-900 mb-3">Data Preview (Mapped Columns)</h3>
                    <div className="border border-gray-300 overflow-x-auto max-h-64">
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          {getPreviewHeaders().map((header) => (
                            <th key={header} className="px-4 py-2 text-left text-xs text-gray-700 border-b border-gray-300 min-w-[120px]">
                              {header}
                            </th>
                          ))}
                        </thead>
                        <tbody>
                          {getMappedPreviewData().map((row, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              {getPreviewHeaders().map((header) => (
                                <td key={header} className="px-4 py-2 text-xs text-gray-900">
                                  {String(row[header] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Showing first {Math.min(10, parsedCsvData.length)} rows with mapped columns
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SECTION C: Data Health Summary */}
        {dataIngested && uploadedFile && (
          <div className="bg-white border border-gray-300 p-8">
            <div className="mb-6">
              <h2 className="text-base text-gray-900 mb-1">3. Data Health Summary</h2>
              <p className="text-sm text-gray-600">Structural validation of ledger prior to risk analysis.</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
                <p className="text-lg text-gray-900">{dataMetrics.totalTransactions.toLocaleString()}</p>
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs text-gray-600 mb-1">Total Debit</p>
                <p className="text-lg text-gray-900">{dataMetrics.totalDebit}</p>
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs text-gray-600 mb-1">Total Credit</p>
                <p className="text-lg text-gray-900">{dataMetrics.totalCredit}</p>
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4">
                <p className="text-xs text-gray-600 mb-1">Date Range</p>
                <p className="text-lg text-gray-900">{dataMetrics.dateRange}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="border border-gray-300 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-900">Debit = Credit</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-900">{dataMetrics.missingNarrations} Missing Narrations</p>
                </div>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-900">{dataMetrics.duplicateJournalIds} Duplicate Journal IDs</p>
                </div>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="border border-gray-300 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-900">{dataMetrics.manualEntries} Manual Entries</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>

            <p className="text-xs text-gray-600">Review data issues before proceeding to risk analysis.</p>
          </div>
        )}

        {/* Action Buttons Section */}
        {dataIngested && uploadedFile && (
          <div className="border-t border-gray-300 pt-8">
            {isReplaceMode && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-900 font-medium">Warning</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Re-running analysis will replace the current risk results for this workbook.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors rounded-lg"
              >
                Reset
              </button>
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !workbookId || !isReadyForAnalysis()}
                className="px-5 py-2 text-sm bg-[#095859] text-white hover:bg-[#0B6B6A] transition-colors rounded-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  !isReadyForAnalysis() ? 'Complete Mapping to Run' : (isReplaceMode ? 'Re-run Risk Analysis' : 'Run Risk Analysis')
                )}
              </button>
              {analysisResult && (
                <button
                  onClick={handleNavigateToWorkbook}
                  className="px-5 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  View Results
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

