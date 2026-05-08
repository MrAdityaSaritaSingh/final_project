import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FiltersSidebarProps {
  onApplyFilters: (filters: any) => void;
  onResetFilters: () => void;
}

export default function FiltersSidebar({ onApplyFilters, onResetFilters }: FiltersSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Ledger Type
  const [ledgerType, setLedgerType] = useState('');
  
  // Account Series
  const [accountAssets, setAccountAssets] = useState(false);
  const [accountLiabilities, setAccountLiabilities] = useState(false);
  const [accountEquity, setAccountEquity] = useState(false);
  const [accountRevenue, setAccountRevenue] = useState(false);
  const [accountCOGS, setAccountCOGS] = useState(false);
  const [accountExpenses, setAccountExpenses] = useState(false);
  
  // Time Period
  const [financialYear, setFinancialYear] = useState('');
  const [quarter, setQuarter] = useState('');
  
  // Amount Filters
  const [customAmount, setCustomAmount] = useState('');
  const [amountAbove500k, setAmountAbove500k] = useState(false);
  const [topTenPercent, setTopTenPercent] = useState(false);
  
  // Keyword Search (replaced Narration Filters)
  const [keywordSearch, setKeywordSearch] = useState('');
  
  // Voucher Type
  const [voucherJournal, setVoucherJournal] = useState(false);
  const [voucherPayment, setVoucherPayment] = useState(false);
  const [voucherReceipt, setVoucherReceipt] = useState(false);
  const [voucherContra, setVoucherContra] = useState(false);
  const [voucherOther, setVoucherOther] = useState(false);
  
  const handleReset = () => {
    // Reset all filter states
    setLedgerType('');
    setAccountAssets(false);
    setAccountLiabilities(false);
    setAccountEquity(false);
    setAccountRevenue(false);
    setAccountCOGS(false);
    setAccountExpenses(false);
    setFinancialYear('');
    setQuarter('');
    setCustomAmount('');
    setAmountAbove500k(false);
    setTopTenPercent(false);
    setKeywordSearch('');
    setVoucherJournal(false);
    setVoucherPayment(false);
    setVoucherReceipt(false);
    setVoucherContra(false);
    setVoucherOther(false);
    
    // Call parent reset handler
    onResetFilters();
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col h-full items-center pt-6">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Show filters"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-gray-900">Filters</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Hide filters</span>
          </button>
        </div>

        {/* 1) Ledger Type - Single-select dropdown */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-2">Ledger Type</label>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Select Ledger</label>
            <select 
              value={ledgerType}
              onChange={(e) => setLedgerType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#095859]"
            >
              <option value="">Select Ledger</option>
              <option value="general">General Ledger</option>
              <option value="ar">Accounts Receivable Ledger</option>
              <option value="ap">Accounts Payable Ledger</option>
              <option value="payroll">Payroll Ledger</option>
              <option value="inventory">Inventory Ledger</option>
              <option value="fixed-assets">Fixed Assets Ledger</option>
              <option value="bank">Bank Ledger</option>
              <option value="purchase">Purchase Ledger</option>
              <option value="sales">Sales Ledger</option>
            </select>
          </div>
        </div>

        {/* 2) Account Series - Multi-select checkboxes */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-3">Account Series</label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountAssets}
                onChange={(e) => setAccountAssets(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">1000–1999: Assets</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountLiabilities}
                onChange={(e) => setAccountLiabilities(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">2000–2999: Liabilities</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountEquity}
                onChange={(e) => setAccountEquity(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">3000–3999: Equity</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountRevenue}
                onChange={(e) => setAccountRevenue(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">4000–4999: Revenue / Income</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountCOGS}
                onChange={(e) => setAccountCOGS(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">5000–5999: Cost of Goods Sold (COGS)</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accountExpenses}
                onChange={(e) => setAccountExpenses(e.target.checked)}
                className="rounded border-gray-300 mt-0.5" 
              />
              <span className="text-sm text-gray-700">6000–7999: Expenses</span>
            </label>
          </div>
        </div>

        {/* 3) Time Period - Two dropdowns */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-3">Time Period</label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Select FY (1 Apr – 31 Mar)</label>
              <select 
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#095859]"
              >
                <option value="">Select Financial Year</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2024-25">FY 2024-25</option>
                <option value="2023-24">FY 2023-24</option>
                <option value="2022-23">FY 2022-23</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quarter</label>
              <select 
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#095859]"
              >
                <option value="">All Quarters</option>
                <option value="q1">Q1 (Apr-Jun)</option>
                <option value="q2">Q2 (Jul-Sep)</option>
                <option value="q3">Q3 (Oct-Dec)</option>
                <option value="q4">Q4 (Jan-Mar)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4) Amount Filters - Custom input + presets */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-3">Amount Filters</label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Amount above (₹)</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter custom threshold (e.g., 500000)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#095859]"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={amountAbove500k}
                  onChange={(e) => setAmountAbove500k(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span className="text-sm text-gray-700">Above ₹5,00,000</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={topTenPercent}
                  onChange={(e) => setTopTenPercent(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span className="text-sm text-gray-700">Top 10% of expenses</span>
              </label>
            </div>
          </div>
        </div>

        {/* 5) Keyword Search (replaced Narration Filters) */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-3">Keyword Search</label>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Search transactions</label>
            <input
              type="text"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              placeholder="Search by keyword (e.g., 'adjustment', 'rent', 'being')"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#095859]"
            />
          </div>
        </div>

        {/* 6) Voucher Type - Multi-select checkboxes */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-700 mb-3">Voucher Type</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={voucherJournal}
                onChange={(e) => setVoucherJournal(e.target.checked)}
                className="rounded border-gray-300" 
              />
              <span className="text-sm text-gray-700">Journal entries only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={voucherPayment}
                onChange={(e) => setVoucherPayment(e.target.checked)}
                className="rounded border-gray-300" 
              />
              <span className="text-sm text-gray-700">Payment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={voucherReceipt}
                onChange={(e) => setVoucherReceipt(e.target.checked)}
                className="rounded border-gray-300" 
              />
              <span className="text-sm text-gray-700">Receipt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={voucherContra}
                onChange={(e) => setVoucherContra(e.target.checked)}
                className="rounded border-gray-300" 
              />
              <span className="text-sm text-gray-700">Contra</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={voucherOther}
                onChange={(e) => setVoucherOther(e.target.checked)}
                className="rounded border-gray-300" 
              />
              <span className="text-sm text-gray-700">Other</span>
            </label>
          </div>
        </div>
      </div>

      {/* Apply Filters Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-2">
        <button 
          onClick={() => {
            const filters = {
              ledgerType,
              accountAssets,
              accountLiabilities,
              accountEquity,
              accountRevenue,
              accountCOGS,
              accountExpenses,
              financialYear,
              quarter,
              customAmount,
              amountAbove500k,
              topTenPercent,
              keywordSearch,
              voucherJournal,
              voucherPayment,
              voucherReceipt,
              voucherContra,
              voucherOther,
            };
            onApplyFilters(filters);
          }}
          className="w-full bg-[#095859] text-white py-3 rounded-lg hover:bg-[#0B6B6A] transition-colors"
        >
          Apply Filters
        </button>
        <button 
          onClick={handleReset}
          className="w-full bg-white text-gray-700 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}