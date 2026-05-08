import { useState, useMemo, useEffect } from 'react';
import type { InvestigationWorkspaceState } from '../types';
import { createWorkspace, cloneFilters, EMPTY_FILTERS, getRowValue, getRowAmount, rowMatchesQuery } from '../utils';

export function useInvestigationWorkspace(reviewRows: Record<string, unknown>[], initialResults: unknown) {
  const [investigationTabs, setInvestigationTabs] = useState<InvestigationWorkspaceState[]>([createWorkspace(1)]);
  const [activeInvestigationTabId, setActiveInvestigationTabId] = useState<string>(() => createWorkspace(1).id);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameTabValue, setRenameTabValue] = useState('');

  const activeInvestigationTab = useMemo(() => {
    return investigationTabs.find((item) => item.id === activeInvestigationTabId) ?? investigationTabs[0];
  }, [investigationTabs, activeInvestigationTabId]);

  const updateActiveInvestigationTab = (updater: (current: InvestigationWorkspaceState) => InvestigationWorkspaceState) => {
    setInvestigationTabs((prev) =>
      prev.map((item) => (item.id === activeInvestigationTabId ? updater(item) : item)),
    );
  };

  const investigationRows = useMemo(() => {
    if (!activeInvestigationTab?.hasRequested) {
      return [];
    }

    const appliedFilters = activeInvestigationTab.appliedFilters;
    const appliedQuery = activeInvestigationTab.appliedQuery;

    let rows = [...reviewRows];

    rows = rows.filter((row) => {
      if (!appliedFilters.ledgerType) return true;
      const ledger = getRowValue(row, ['ledger_type', 'Ledger Type', 'ledger_name', 'Account']);
      return ledger.toLowerCase().includes(appliedFilters.ledgerType.toLowerCase());
    });

    rows = rows.filter((row) => {
      if (!appliedFilters.accountSeries) return true;
      const account = getRowValue(row, ['account', 'Account', 'ledger_name']);
      return account.toLowerCase().includes(appliedFilters.accountSeries.toLowerCase());
    });

    rows = rows.filter((row) => {
      if (!appliedFilters.financialYear) return true;
      const year = getRowValue(row, ['fiscal_year', 'Financial Year', 'date', 'Date']);
      return year.toLowerCase().includes(appliedFilters.financialYear.toLowerCase());
    });

    rows = rows.filter((row) => {
      if (appliedFilters.quarter === 'all' || !appliedFilters.quarter) return true;
      const dateValue = getRowValue(row, ['date', 'Date', 'transaction_date', 'Transaction Date']);
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return true;
      const month = parsed.getMonth();
      const quarterMap: Record<string, number[]> = {
        q1: [0, 1, 2],
        q2: [3, 4, 5],
        q3: [6, 7, 8],
        q4: [9, 10, 11],
      };
      return quarterMap[appliedFilters.quarter]?.includes(month) ?? true;
    });

    rows = rows.filter((row) => {
      if (!appliedFilters.keyword.trim()) return true;
      const narration = getRowValue(row, ['narration', 'Narration', 'description']);
      return narration.toLowerCase().includes(appliedFilters.keyword.trim().toLowerCase());
    });

    if (appliedFilters.voucherTypes.length > 0) {
      rows = rows.filter((row) => {
        const voucher = getRowValue(row, ['voucher_type', 'Voucher Type']).toLowerCase();
        return appliedFilters.voucherTypes.some((type) => voucher.includes(type.toLowerCase()));
      });
    }

    if (appliedFilters.currencies.length > 0) {
      rows = rows.filter((row) => {
        const currency = getRowValue(row, ['currency', 'Currency']).toUpperCase();
        return appliedFilters.currencies.some((value) => currency.includes(value));
      });
    }

    const customThreshold = Number(appliedFilters.customThreshold.replace(/,/g, ''));
    if (Number.isFinite(customThreshold) && customThreshold > 0) {
      rows = rows.filter((row) => getRowAmount(row) >= customThreshold);
    }

    if (appliedFilters.amountPreset === 'above500k') {
      rows = rows.filter((row) => getRowAmount(row) >= 500000);
    }

    if (appliedFilters.amountPreset === 'top10expenses') {
      const sorted = [...rows].sort((a, b) => getRowAmount(b) - getRowAmount(a));
      const topCount = Math.max(1, Math.floor(sorted.length * 0.1));
      rows = sorted.slice(0, topCount);
    }

    rows = rows.filter((row) => rowMatchesQuery(row, appliedQuery));

    return rows.slice(0, 300);
  }, [reviewRows, activeInvestigationTab]);

  const addInvestigationTab = () => {
    const nextIndex = investigationTabs.length + 1;
    const nextTab = createWorkspace(nextIndex);
    setInvestigationTabs((prev) => [...prev, nextTab]);
    setActiveInvestigationTabId(nextTab.id);
  };

  const startRenameTab = (tabId: string) => {
    const current = investigationTabs.find((item) => item.id === tabId);
    if (!current) return;
    setRenamingTabId(tabId);
    setRenameTabValue(current.label);
  };

  const commitRenameTab = () => {
    if (!renamingTabId) return;

    const nextLabel = renameTabValue.trim();
    if (nextLabel) {
      setInvestigationTabs((prev) =>
        prev.map((item) => (item.id === renamingTabId ? { ...item, label: nextLabel } : item)),
      );
    }

    setRenamingTabId(null);
    setRenameTabValue('');
  };

  const cancelRenameTab = () => {
    setRenamingTabId(null);
    setRenameTabValue('');
  };

  const resetFilters = () => {
    updateActiveInvestigationTab((current) => ({
      ...current,
      draftFilters: cloneFilters(EMPTY_FILTERS),
      appliedFilters: cloneFilters(EMPTY_FILTERS),
      queryInput: '',
      appliedQuery: '',
      hasRequested: false,
    }));
  };

  const applyFilters = () => {
    updateActiveInvestigationTab((current) => ({
      ...current,
      appliedFilters: cloneFilters(current.draftFilters),
      hasRequested: true,
    }));
  };

  const updateMultiSelect = (bucket: 'voucherTypes' | 'currencies', value: string, checked: boolean) => {
    updateActiveInvestigationTab((current) => {
      const existing = current.draftFilters[bucket];
      const next = checked ? [...existing, value] : existing.filter((item) => item !== value);
      return {
        ...current,
        draftFilters: {
          ...current.draftFilters,
          [bucket]: next,
        },
      };
    });
  };

  // Reset tabs when results change
  useEffect(() => {
    if (!initialResults) return;
    const newTab = createWorkspace(1);
    setInvestigationTabs([newTab]);
    setActiveInvestigationTabId(newTab.id);
  }, [initialResults]);

  useEffect(() => {
    if (!investigationTabs.some((item) => item.id === activeInvestigationTabId)) {
      setActiveInvestigationTabId(investigationTabs[0]?.id ?? '');
    }
  }, [investigationTabs, activeInvestigationTabId]);

  return {
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
    resetFilters,
    applyFilters,
    updateMultiSelect,
  };
}
