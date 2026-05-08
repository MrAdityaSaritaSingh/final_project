import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Loader2, Copy, Download, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import FiltersSidebar from '../components/FiltersSidebar';
import QueryBox from '../components/QueryBox';
import PaginationBar from '../components/PaginationBar';
import { useWorkbook } from '../context/WorkbookContext';
import { workbooksApi } from '../../api/workbooksApi';

interface Tab {
  id: string;
  label: string;
  transactions: Transaction[];
  lastRefreshed: Date | null;
}

interface Transaction {
  id: string;
  date: string;
  voucherNo: string;
  account: string;
  narration: string;
  debit: string;
  credit: string;
  scrutinyCategory: string;
  scrutinyReason: string;
}

interface ActiveFilter {
  id: string;
  label: string;
  value: string;
}

interface DashboardProps {
  embedded?: boolean;
  workbookId?: string;
  initialCsvData?: any[];
  initialColumnMappings?: Record<string, string>;
}

export default function Dashboard({ embedded = false, workbookId, initialColumnMappings = {} }: DashboardProps) {
  const navigate = useNavigate();
  const { workbookData } = useWorkbook();
  const columnMappings = workbookData?.columnMappings ?? initialColumnMappings ?? {};
  
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', label: 'Tab 1', transactions: [], lastRefreshed: null }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showMenuForTab, setShowMenuForTab] = useState<string | null>(null);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  
  // Filtering and API state
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [apiParams, setApiParams] = useState<Record<string, any>>({});
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResultLabel, setQueryResultLabel] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Fetch transactions from API
  useEffect(() => {
    if (!workbookId) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await workbooksApi.getTransactions(
          workbookId,
          currentPage,
          pageSize,
          'flagged', // Default to flagged for investigation workspace
          apiParams
        );

        const parseAmount = (val: any): number => {
          if (val == null || val === '') return NaN;
          if (typeof val === 'number') return val;
          // Strip commas, currency symbols, and whitespace
          const cleaned = String(val).replace(/,/g, '').replace(/[₹$€£]/g, '').trim();
          return Number(cleaned);
        };

        const mappedTransactions: Transaction[] = response.transactions.map((row: any, index: number) => {
          const rawDebit = row[columnMappings['Debit']];
          const rawCredit = row[columnMappings['Credit']];
          const debitNum = parseAmount(rawDebit);
          const creditNum = parseAmount(rawCredit);

          return {
            id: String(index + 1 + (currentPage - 1) * pageSize),
            date: row[columnMappings['Date']] || row.date || '',
            voucherNo: row[columnMappings['Journal ID']] || row.journal_id || row.voucher_no || '',
            account: row[columnMappings['Account Name']] || row.account || '',
            narration: row[columnMappings['Narration']] || row.narration || '',
            debit: !isNaN(debitNum) && debitNum !== 0 ? `₹${Math.abs(debitNum).toLocaleString()}` : '',
            credit: !isNaN(creditNum) && creditNum !== 0 ? `₹${Math.abs(creditNum).toLocaleString()}` : '',
            scrutinyCategory: row.scrutiny_category || '',
            scrutinyReason: row.scrutiny_reason || '',
          };
        });

        setTotalCount(response.total);

        setTabs(prevTabs =>
          prevTabs.map(tab =>
            tab.id === activeTabId
              ? { ...tab, transactions: mappedTransactions, lastRefreshed: new Date() }
              : tab
          )
        );
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [workbookId, currentPage, pageSize, activeTabId, columnMappings, apiParams]);

  const addTab = () => {
    const newTabNumber = tabs.length + 1;
    const newTab: Tab = {
      id: String(newTabNumber),
      label: `Tab ${newTabNumber}`,
      transactions: [],
      lastRefreshed: null
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const startRenaming = (tabId: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTabId(tabId);
    setRenameValue(currentLabel);
    setShowMenuForTab(null);
  };

  const finishRenaming = () => {
    if (renamingTabId && renameValue.trim()) {
      setTabs(tabs.map(tab =>
        tab.id === renamingTabId ? { ...tab, label: renameValue.trim() } : tab
      ));
    }
    setRenamingTabId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishRenaming();
    } else if (e.key === 'Escape') {
      setRenamingTabId(null);
      setRenameValue('');
    }
  };

  const handleQuery = (query: string) => {
    setCurrentQuery(query);
    setQueryResultLabel(''); 
    
    // Convert natural language query to backend API params
    const queryLower = query.toLowerCase().trim();
    const newParams: Record<string, any> = { ...apiParams };

    if (queryLower.includes('weekend')) {
      newParams.search = 'weekend';
      setQueryResultLabel(`Showing: Weekend Transactions`);
    } else if (queryLower.includes('round') && queryLower.includes('transaction')) {
      newParams.search = 'round';
      setQueryResultLabel(`Showing: Round Number Transactions`);
    } else if (queryLower.includes('top') && queryLower.includes('10') && queryLower.includes('expense')) {
      newParams.search = 'top10_expenses';
      setQueryResultLabel(`Showing: Top 10% Expenses`);
    } else {
      newParams.search = query;
      setQueryResultLabel(`Search: "${query}"`);
    }

    setApiParams(newParams);
    setCurrentPage(1); // Reset to first page
  };

  const handleApplyFilters = (filters: any) => {
    const activeFiltersList: ActiveFilter[] = [];
    const newParams: Record<string, any> = {};

    if (filters.ledgerType) {
      activeFiltersList.push({ id: 'ledgerType', label: 'Ledger Type', value: filters.ledgerType });
      newParams.ledger_type = filters.ledgerType;
    }
    if (filters.financialYear) {
      activeFiltersList.push({ id: 'financialYear', label: 'Financial Year', value: filters.financialYear });
      newParams.financial_year = filters.financialYear;
    }
    if (filters.quarter) {
      activeFiltersList.push({ id: 'quarter', label: 'Quarter', value: filters.quarter });
      newParams.quarter = filters.quarter;
    }
    if (filters.customAmount) {
      activeFiltersList.push({ id: 'customAmount', label: 'Amount Above', value: `₹${filters.customAmount}` });
      newParams.min_amount = filters.customAmount;
    }
    if (filters.keywordSearch) {
      activeFiltersList.push({ id: 'keywordSearch', label: 'Keyword', value: filters.keywordSearch });
      newParams.search = filters.keywordSearch;
    }

    // Voucher Types
    const voucherTypesList = [];
    if (filters.voucherJournal) voucherTypesList.push('Journal');
    if (filters.voucherPayment) voucherTypesList.push('Payment');
    if (filters.voucherReceipt) voucherTypesList.push('Receipt');
    if (filters.voucherContra) voucherTypesList.push('Contra');
    if (filters.voucherOther) voucherTypesList.push('Other');
    
    if (voucherTypesList.length > 0) {
      activeFiltersList.push({ id: 'voucherTypes', label: 'Vouchers', value: voucherTypesList.join(', ') });
      newParams.voucher_types = voucherTypesList.join(',');
    }

    // Account Series
    const seriesList = [];
    if (filters.accountAssets) seriesList.push('1000');
    if (filters.accountLiabilities) seriesList.push('2000');
    if (filters.accountEquity) seriesList.push('3000');
    if (filters.accountRevenue) seriesList.push('4000');
    if (filters.accountCOGS) seriesList.push('5000');
    if (filters.accountExpenses) seriesList.push('6000');
    
    if (seriesList.length > 0) {
      activeFiltersList.push({ id: 'accountSeries', label: 'Series', value: seriesList.join(', ') });
      newParams.account_series = seriesList.join(','); 
    }

    // Amount Presets
    if (filters.amountAbove500k) {
      activeFiltersList.push({ id: 'amountAbove500k', label: 'Preset', value: 'Above ₹5L' });
      newParams.amount_preset = 'above500k';
    } else if (filters.topTenPercent) {
      activeFiltersList.push({ id: 'topTenPercent', label: 'Preset', value: 'Top 10%' });
      newParams.amount_preset = 'top10expenses';
    }
    
    setActiveFilters(activeFiltersList);
    setApiParams(newParams);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters([]);
    setCurrentQuery('');
    setQueryResultLabel('');
    setApiParams({});
    setCurrentPage(1);
  };

  const removeFilter = (filterId: string) => {
    const newFilters = activeFilters.filter(f => f.id !== filterId);
    setActiveFilters(newFilters);
    
    const newParams = { ...apiParams };
    // Map filterId to apiParam key
    const filterToParamMap: Record<string, string> = {
      'ledgerType': 'ledger_type',
      'financialYear': 'financial_year',
      'quarter': 'quarter',
      'customAmount': 'min_amount',
      'keywordSearch': 'search'
    };
    
    if (filterToParamMap[filterId]) {
      delete newParams[filterToParamMap[filterId]];
    }
    
    setApiParams(newParams);
    setCurrentPage(1);
  };

  const handleDownloadReport = () => {
    console.log('Download report for tab:', activeTabId);
  };

  const handleReuploadData = () => {
    setShowReuploadModal(true);
  };

  const getTimeSinceRefresh = (lastRefreshed: Date | null): string => {
    if (!lastRefreshed) return '';
    const seconds = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  };

  const handleAddToDocumentation = () => {
    toast.success('Transaction added to Documentation');
  };

  return (
    <div className={`flex flex-col bg-gray-50 overflow-hidden ${embedded ? 'h-full' : 'h-screen'}`}>
      {/* Header */}
      {!embedded && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/risk-intelligence')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Risk Dashboard
              </button>
              <h1 className="text-xl text-gray-900">Transaction Investigation</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReuploadData}
                className="px-4 py-2 text-sm bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Re-upload data
              </button>
              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <FiltersSidebar
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0">
            {tabs.map(tab => (
              <div key={tab.id} className="relative">
                <div
                  className={`px-4 py-3 text-sm border-b-2 transition-colors flex items-center gap-2 group cursor-pointer ${
                    activeTabId === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {renamingTabId === tab.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={finishRenaming}
                      onKeyDown={handleRenameKeyDown}
                      autoFocus
                      className="w-32 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span onClick={() => setActiveTabId(tab.id)}>{tab.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenuForTab(showMenuForTab === tab.id ? null : tab.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                        type="button"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                      {tabs.length > 1 && (
                        <button
                          onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id, e);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {showMenuForTab === tab.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenuForTab(null)}
                    />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-20 min-w-[120px]">
                      <button
                        onClick={(e) => startRenaming(tab.id, tab.label, e)}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                      >
                        Rename tab
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={addTab}
              className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add new tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Results Section */}
          <div className="flex-1 overflow-auto bg-white flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Loading transactions...</p>
                </div>
              </div>
            ) : activeTab && activeTab.transactions.length > 0 ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab.lastRefreshed?.getTime() || 'empty'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500">
                            Results update from server based on filters and queries.
                          </p>
                          {activeTab.lastRefreshed && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Results refreshed {getTimeSinceRefresh(activeTab.lastRefreshed)}
                            </p>
                          )}
                        </div>
                        {currentQuery && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            Query: "{currentQuery}"
                          </div>
                        )}
                        {queryResultLabel && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-medium">
                            {queryResultLabel}
                          </div>
                        )}
                      </div>

                      {activeFilters.length > 0 && (
                        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
                          <div className="flex items-start gap-3">
                            <span className="text-xs text-gray-600 pt-1.5 whitespace-nowrap">Active Filters:</span>
                            <div className="flex flex-wrap gap-2">
                              {activeFilters.map(filter => (
                                <div
                                  key={filter.id}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-full text-xs text-gray-700"
                                >
                                  <span>
                                    <span className="font-medium">{filter.label}:</span> {filter.value}
                                  </span>
                                  <button
                                    onClick={() => removeFilter(filter.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title={`Remove ${filter.label} filter`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b">Date</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b">Voucher No</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b">Account</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b">Narration</th>
                            <th className="px-4 py-3 text-right text-xs text-gray-600 border-b">Debit</th>
                            <th className="px-4 py-3 text-right text-xs text-gray-600 border-b">Credit</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b">Scrutiny Category</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 border-b w-80">Scrutiny Reason</th>
                            <th className="px-4 py-3 text-center text-xs text-gray-600 border-b w-20">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeTab.transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50 border-b border-gray-100">
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{transaction.date}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{transaction.voucherNo}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{transaction.account}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {transaction.narration || <span className="text-gray-400 italic">No narration</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">{transaction.debit}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">{transaction.credit}</td>
                              <td className="px-4 py-3 text-sm">
                                {transaction.scrutinyCategory ? (
                                  <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                                    {transaction.scrutinyCategory}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 w-80">{transaction.scrutinyReason}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleAddToDocumentation()}
                                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Add to Documentation"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  </AnimatePresence>
                </div>
                
                {/* Pagination Controls */}
                <div className="mt-auto flex-shrink-0 border-t border-gray-200">
                  <PaginationBar 
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[400px] text-gray-400">
                <div className="text-center">
                  <p className="text-sm">No transactions to display</p>
                  <p className="text-xs mt-1">Adjust filters or queries to view data</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Docked Query Bar */}
          <div className="bg-white border-t border-gray-200 px-6 py-5 flex-shrink-0" style={{ boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)' }}>
            <QueryBox onQuery={handleQuery} />
          </div>
        </div>
      </div>

      {/* Reupload Data Modal */}
      {showReuploadModal && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-white bg-opacity-10 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
            <button
              onClick={() => setShowReuploadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h2 className="text-lg text-left text-gray-900 mb-4">Re-upload ledger?</h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to re-upload the ledger?<br />
                Doing so will terminate the current session and clear all current analysis.
              </p>
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setShowReuploadModal(false)}
                  className="flex-1 px-4 py-3 text-sm bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowReuploadModal(false);
                    navigate('/');
                  }}
                  className="flex-1 px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yes, re-upload ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
