import React from 'react';
import type { InvestigationWorkspaceState } from './types';
import { FilterSection, CheckRow } from './ui';

interface Props {
  activeTab: InvestigationWorkspaceState;
  updateActiveTab: (updater: (current: InvestigationWorkspaceState) => InvestigationWorkspaceState) => void;
  onHide: () => void;
  onApply: () => void;
  onReset: () => void;
  updateMultiSelect: (bucket: 'voucherTypes' | 'currencies', value: string, checked: boolean) => void;
}

export function InvestigationSidebar({
  activeTab,
  updateActiveTab,
  onHide,
  onApply,
  onReset,
  updateMultiSelect,
}: Props) {
  if (!activeTab) return null;

  return (
    <aside className="w-[360px] border-r border-slate-200 bg-white p-5 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-2xl font-semibold text-slate-900">Filters</h4>
        <button className="text-sm text-blue-600" onClick={onHide}>
          Hide filters
        </button>
      </div>

      <FilterSection title="Ledger Type">
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={activeTab.draftFilters.ledgerType}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, ledgerType: e.target.value },
            }))
          }
        >
          <option value="">Select Ledger</option>
          <option value="General Ledger">General Ledger</option>
        </select>
      </FilterSection>

      <FilterSection title="Account Series">
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={activeTab.draftFilters.accountSeries}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, accountSeries: e.target.value },
            }))
          }
        >
          <option value="">Select Account Series</option>
          <option value="1000">1000-1999: Assets</option>
          <option value="2000">2000-2999: Liabilities</option>
          <option value="3000">3000-3999: Equity</option>
          <option value="4000">4000-4999: Revenue / Income</option>
          <option value="5000">5000-5999: Cost of Goods Sold (COGS)</option>
          <option value="6000">6000-7999: Expenses</option>
        </select>
      </FilterSection>

      <FilterSection title="Time Period">
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
          value={activeTab.draftFilters.financialYear}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, financialYear: e.target.value },
            }))
          }
        >
          <option value="">Select Financial Year</option>
          <option value="2023">FY 2023-24</option>
          <option value="2024">FY 2024-25</option>
        </select>
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={activeTab.draftFilters.quarter}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, quarter: e.target.value },
            }))
          }
        >
          <option value="all">All Quarters</option>
          <option value="q1">Q1</option>
          <option value="q2">Q2</option>
          <option value="q3">Q3</option>
          <option value="q4">Q4</option>
        </select>
      </FilterSection>

      <FilterSection title="Amount Filters">
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
          placeholder="Enter custom threshold (e.g., 500000)"
          value={activeTab.draftFilters.customThreshold}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, customThreshold: e.target.value },
            }))
          }
        />
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={activeTab.draftFilters.amountPreset === 'above500k'}
              onChange={() =>
                updateActiveTab((current) => ({
                  ...current,
                  draftFilters: { ...current.draftFilters, amountPreset: 'above500k' },
                }))
              }
            />
            Above Rs.5,00,000
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={activeTab.draftFilters.amountPreset === 'top10expenses'}
              onChange={() =>
                updateActiveTab((current) => ({
                  ...current,
                  draftFilters: { ...current.draftFilters, amountPreset: 'top10expenses' },
                }))
              }
            />
            Top 10% of expenses
          </label>
        </div>
      </FilterSection>

      <FilterSection title="Keyword Search">
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          placeholder="Search by keyword (e.g., adjustment, rent, being)"
          value={activeTab.draftFilters.keyword}
          onChange={(e) =>
            updateActiveTab((current) => ({
              ...current,
              draftFilters: { ...current.draftFilters, keyword: e.target.value },
            }))
          }
        />
      </FilterSection>

      <FilterSection title="Voucher Type">
        {['Journal', 'Payment', 'Receipt', 'Contra', 'Other'].map((item) => (
          <CheckRow
            key={item}
            label={item === 'Journal' ? 'Journal entries only' : item}
            checked={activeTab.draftFilters.voucherTypes.includes(item)}
            onChange={(checked) => updateMultiSelect('voucherTypes', item, checked)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Currency">
        {['INR', 'USD', 'EUR', 'GBP'].map((item) => (
          <CheckRow
            key={item}
            label={item}
            checked={activeTab.draftFilters.currencies.includes(item)}
            onChange={(checked) => updateMultiSelect('currencies', item, checked)}
          />
        ))}
      </FilterSection>

      <div className="mt-5 space-y-2">
        <button
          className="w-full rounded-xl bg-[#0F766E] text-white font-semibold py-2.5"
          onClick={onApply}
        >
          Apply Filters
        </button>
        <button
          className="w-full rounded-xl border border-slate-300 text-slate-700 font-semibold py-2.5"
          onClick={onReset}
        >
          Reset Filters
        </button>
      </div>
    </aside>
  );
}
