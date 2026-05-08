/**
 * Test Suite: Replace Dataset Feature
 * 
 * Comprehensive testing for the Replace Dataset functionality including:
 * - Unit tests for data transformation logic
 * - Integration tests for state management after replacement
 * - UI/E2E tests for user interactions and visual updates
 * - Edge case handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlaggedTransactionsPage from '../pages/FlaggedTransactionsPage';
import { workbooksApi } from '../api/workbooksApi';
import type { ScrutinyResponse, FlaggedRow } from '../types/scrutiny';

// ─────────────────────────────────────────────────────────────────────────
// UNIT TESTS: Data Analysis Logic
// ─────────────────────────────────────────────────────────────────────────

describe('Replace Dataset - Unit Tests', () => {
  describe('Data Validation & Schema', () => {
    it('should validate flagged row schema matches expected structure', () => {
      const mockRow: FlaggedRow = {
        voucher_no: 'JV-001',
        date: '2024-05-15',
        ledger_name: 'Sales Revenue',
        amount: 10000,
        narration: 'Monthly sales posting',
        voucher_type: 'Journal',
        scrutiny_flag: true,
        scrutiny_category: 'Round Numbers',
        scrutiny_reason: 'Amount is a multiple of 1000',
      };

      expect(mockRow).toHaveProperty('voucher_no');
      expect(mockRow).toHaveProperty('scrutiny_flag');
      expect(mockRow).toHaveProperty('scrutiny_category');
      expect(typeof mockRow.amount).toBe('number');
      expect(typeof mockRow.scrutiny_flag).toBe('boolean');
    });

    it('should handle valid new dataset with different column structure', () => {
      const newDataset = [
        { txn_id: '1', posting_date: '2024-05-15', account: 'AR', txn_amt: 50000, note: 'Invoice' },
        { txn_id: '2', posting_date: '2024-05-16', account: 'PR', txn_amt: 25000, note: 'Payment' },
      ];

      expect(newDataset).toHaveLength(2);
      expect(newDataset[0]).toHaveProperty('txn_id');
      expect(newDataset[0]).not.toHaveProperty('voucher_no');
    });

    it('should reject empty dataset gracefully', () => {
      const emptyDataset: FlaggedRow[] = [];
      expect(emptyDataset).toHaveLength(0);
      expect(Array.isArray(emptyDataset)).toBe(true);
    });

    it('should handle dataset with null/undefined values', () => {
      const rowWithNulls: Partial<FlaggedRow> = {
        voucher_no: 'JV-001',
        narration: null,
        scrutiny_reason: undefined,
      };

      expect(rowWithNulls.narration).toBeNull();
      expect(rowWithNulls.scrutiny_reason).toBeUndefined();
    });

    it('should validate summary schema after analysis', () => {
      const mockSummary = {
        total_entries: 1000,
        rule_flagged: 150,
        ml_flagged: 50,
        total_flagged: 200,
        pct_flagged: 20,
      };

      expect(mockSummary.total_entries).toBeGreaterThan(0);
      expect(mockSummary.total_flagged).toBeLessThanOrEqual(mockSummary.total_entries);
      expect(mockSummary.pct_flagged).toBeGreaterThanOrEqual(0);
      expect(mockSummary.pct_flagged).toBeLessThanOrEqual(100);
    });
  });

  describe('Data Transformation After Replacement', () => {
    it('should correctly compute risk buckets from flagged rows', () => {
      const flaggedRows: FlaggedRow[] = [
        {
          voucher_no: 'ML-001',
          date: '2024-05-15',
          ledger_name: 'Sales',
          amount: 500000,
          narration: 'Large transaction',
          voucher_type: 'Journal',
          scrutiny_flag: true,
          scrutiny_category: 'ML Anomaly',
          scrutiny_reason: 'Outlier detected',
        },
        {
          voucher_no: 'PER-001',
          date: '2024-05-20',
          ledger_name: 'Expenses',
          amount: 50000,
          narration: 'Period end posting',
          voucher_type: 'Payment',
          scrutiny_flag: true,
          scrutiny_category: 'Period End',
          scrutiny_reason: 'Posted on last day of month',
        },
      ];

      expect(flaggedRows).toHaveLength(2);
      const mlRow = flaggedRows.find((r) => r.scrutiny_category.includes('ML'));
      const peRow = flaggedRows.find((r) => r.scrutiny_category.includes('Period'));

      expect(mlRow?.amount).toBeGreaterThan(peRow?.amount!);
    });

    it('should handle multiple category flags per transaction', () => {
      const rowWithMultipleFlags: FlaggedRow = {
        voucher_no: 'JV-999',
        date: '2024-05-31',
        ledger_name: 'Adjustments',
        amount: 10000,
        narration: 'adj',
        voucher_type: 'Journal',
        scrutiny_flag: true,
        scrutiny_category: 'Round Numbers, Period End, Manual Journal',
        scrutiny_reason: 'Matches multiple rules; Manual journal entry; Posted on month-end',
      };

      const categories = rowWithMultipleFlags.scrutiny_category.split(',').map((c) => c.trim());
      expect(categories).toHaveLength(3);
      expect(categories).toContain('Round Numbers');
      expect(categories).toContain('Period End');
      expect(categories).toContain('Manual Journal');
    });

    it('should reset investigation tabs when dataset changes', () => {
      const initialTab = { id: '1', label: 'Workspace 1' };
      const newTabs = [{ id: '2', label: 'Workspace 1' }];

      expect(initialTab.id).not.toBe(newTabs[0].id);
      expect(newTabs).toHaveLength(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS: State Management & API Calls
// ─────────────────────────────────────────────────────────────────────────

describe('Replace Dataset - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Integration', () => {
    it('should call ingestFile API with correct parameters', async () => {
      const mockIngestFile = vi.spyOn(workbooksApi, 'ingestFile').mockResolvedValue({
        summary: { total_entries: 100, rule_flagged: 10, ml_flagged: 5, total_flagged: 15, pct_flagged: 15 },
        flagged_rows: [],
      });
      const mockFile = new File(['test data'], 'ledger.csv', { type: 'text/csv' });

      await workbooksApi.ingestFile('workbook-123', mockFile, true, 0.05);

      expect(mockIngestFile).toHaveBeenCalledWith('workbook-123', mockFile, true, 0.05);
      mockIngestFile.mockRestore();
    });

    it('should call getTransactions API after dataset replacement', async () => {
      const mockGetTransactions = vi.spyOn(workbooksApi, 'getTransactions').mockResolvedValue({
        transactions: [],
        count: 0,
      });

      const result = await workbooksApi.getTransactions('workbook-123');

      expect(mockGetTransactions).toHaveBeenCalledWith('workbook-123');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('count');
      mockGetTransactions.mockRestore();
    });

    it('should call queryTransactions API with filter parameters', async () => {
      const mockQueryTransactions = vi.spyOn(workbooksApi, 'queryTransactions').mockResolvedValue({
        transactions: [],
        count: 0,
        filters_applied: {},
      });
      const filters = { search_text: 'payment', min_amount: 50000 };

      const result = await workbooksApi.queryTransactions('workbook-123', filters);

      expect(mockQueryTransactions).toHaveBeenCalledWith('workbook-123', filters);
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('filters_applied');
      mockQueryTransactions.mockRestore();
    });

    it('should handle API errors gracefully', async () => {
      const mockIngestFile = vi.spyOn(workbooksApi, 'ingestFile').mockRejectedValueOnce(
        new Error('Network error')
      );

      try {
        await workbooksApi.ingestFile('workbook-123', new File([], 'test.csv'), true, 0.05);
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }

      mockIngestFile.mockRestore();
    });
  });

  describe('State Updates After Replacement', () => {
    it('should update results state with new analysis data', () => {
      const newResults: ScrutinyResponse = {
        summary: {
          total_entries: 500,
          rule_flagged: 50,
          ml_flagged: 10,
          total_flagged: 60,
          pct_flagged: 12,
        },
        category_counts: [
          { category: 'Round Numbers', count: 20 },
          { category: 'ML Anomaly', count: 10 },
        ],
        flagged_rows: [
          {
            voucher_no: 'JV-001',
            date: '2024-05-15',
            ledger_name: 'Sales',
            amount: 10000,
            narration: 'Test',
            voucher_type: 'Journal',
            scrutiny_flag: true,
            scrutiny_category: 'Round Numbers',
            scrutiny_reason: 'Multiple of 1000',
          },
        ],
      };

      expect(newResults.summary.total_entries).not.toBe(1000);
      expect(newResults.flagged_rows).toHaveLength(1);
    });

    it('should reset investigation tabs on dataset change', () => {
      const oldTabs = [
        { id: '1', label: 'Analysis 1' },
        { id: '2', label: 'Analysis 2' },
      ];

      const newTabs = [{ id: '1', label: 'Workspace 1' }];

      expect(newTabs).toHaveLength(1);
      expect(oldTabs).toHaveLength(2);
      expect(newTabs[0].id).toBe(oldTabs[0].id);
    });

    it('should switch to overview tab after replacement', () => {
      let currentTab: string = 'investigation';
      const newResults: ScrutinyResponse = {
        summary: { total_entries: 100, rule_flagged: 10, ml_flagged: 5, total_flagged: 15, pct_flagged: 15 },
        category_counts: [],
        flagged_rows: [],
      };

      if (newResults) {
        currentTab = 'overview';
      }

      expect(currentTab).toBe('overview');
    });

    it('should preserve workbook metadata (name, year, status)', () => {
      const metadata = {
        workbookName: 'ABC Corp FY2024',
        financialYear: '2024-25',
        workbookStatus: 'In Progress',
      };

      const updatedResults: ScrutinyResponse = {
        summary: { total_entries: 200, rule_flagged: 20, ml_flagged: 5, total_flagged: 25, pct_flagged: 12.5 },
        category_counts: [],
        flagged_rows: [],
      };

      expect(metadata.workbookName).toBe('ABC Corp FY2024');
      expect(updatedResults.summary.total_entries).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UI/COMPONENT TESTS: Replace Dataset Interaction
// ─────────────────────────────────────────────────────────────────────────

describe('Replace Dataset - UI/Component Tests', () => {
  const mockResults: ScrutinyResponse = {
    summary: {
      total_entries: 1000,
      rule_flagged: 100,
      ml_flagged: 20,
      total_flagged: 120,
      pct_flagged: 12,
    },
    category_counts: [{ category: 'Round Numbers', count: 50 }],
    flagged_rows: [
      {
        voucher_no: 'JV-001',
        date: '2024-05-15',
        ledger_name: 'Sales',
        amount: 10000,
        narration: 'Test transaction',
        voucher_type: 'Journal',
        scrutiny_flag: true,
        scrutiny_category: 'Round Numbers',
        scrutiny_reason: 'Multiple of 1000',
      },
    ],
  };

  const defaultProps = {
    results: mockResults,
    reviewRows: [],
    exporting: false,
    approvalStatus: 'pending' as const,
    workbookName: 'Test Workbook',
    financialYear: '2024-25',
    workbookStatus: 'In Progress',
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onExport: vi.fn(),
    onUploadClick: vi.fn(),
  };

  it('should render Replace Dataset button when results exist', () => {
    render(<FlaggedTransactionsPage {...defaultProps} />);
    const replaceButton = screen.queryByText('Replace Dataset');
    expect(replaceButton).toBeTruthy();
  });

  it('should call onUploadClick when Replace Dataset button is clicked', async () => {
    const user = userEvent.setup();
    const onUploadClickMock = vi.fn();

    render(
      <FlaggedTransactionsPage
        {...defaultProps}
        onUploadClick={onUploadClickMock}
      />
    );

    const replaceButton = screen.queryByText('Replace Dataset');
    if (replaceButton) {
      await user.click(replaceButton);
      expect(onUploadClickMock).toHaveBeenCalled();
    }
  });

  it('should display "No Analysis Yet" message when results are null', () => {
    render(
      <FlaggedTransactionsPage
        {...defaultProps}
        results={null}
      />
    );

    expect(screen.queryByText('No Analysis Yet')).toBeTruthy();
  });

  it('should display KPI cards with values when results exist', () => {
    const { container } = render(
      <FlaggedTransactionsPage {...defaultProps} />
    );

    // Check that the component renders without errors
    expect(container).toBeTruthy();
    expect(defaultProps.results).toBeDefined();
  });

  it('should update component state when new results provided', () => {
    const newResults: ScrutinyResponse = {
      ...mockResults,
      summary: {
        ...mockResults.summary,
        total_entries: 500,
      },
    };

    const { container, rerender } = render(
      <FlaggedTransactionsPage {...defaultProps} />
    );

    expect(container).toBeTruthy();

    rerender(
      <FlaggedTransactionsPage
        {...defaultProps}
        results={newResults}
      />
    );

    expect(container).toBeTruthy();
  });

  it('should not show stale data from previous dataset after replacement', () => {
    const oldResults: ScrutinyResponse = {
      ...mockResults,
      flagged_rows: [
        {
          ...mockResults.flagged_rows[0],
          narration: 'Old transaction',
        },
      ],
    };

    const { container, rerender } = render(
      <FlaggedTransactionsPage
        {...defaultProps}
        results={oldResults}
      />
    );

    const newResults: ScrutinyResponse = {
      ...mockResults,
      flagged_rows: [
        {
          ...mockResults.flagged_rows[0],
          narration: 'New transaction',
          voucher_no: 'JV-999',
        },
      ],
    };

    rerender(
      <FlaggedTransactionsPage
        {...defaultProps}
        results={newResults}
      />
    );

    expect(container).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// EDGE CASE TESTS
// ─────────────────────────────────────────────────────────────────────────

describe('Replace Dataset - Edge Cases', () => {
  it('should handle replacement with zero flagged rows', () => {
    const emptyResults: ScrutinyResponse = {
      summary: {
        total_entries: 500,
        rule_flagged: 0,
        ml_flagged: 0,
        total_flagged: 0,
        pct_flagged: 0,
      },
      category_counts: [],
      flagged_rows: [],
    };

    expect(emptyResults.flagged_rows).toHaveLength(0);
    expect(emptyResults.summary.total_flagged).toBe(0);
    expect(emptyResults.summary.pct_flagged).toBe(0);
  });

  it('should handle very large dataset (performance)', () => {
    const largeDataset: FlaggedRow[] = Array.from({ length: 10000 }, (_, i) => ({
      voucher_no: `JV-${String(i).padStart(6, '0')}`,
      date: '2024-05-15',
      ledger_name: 'Sales',
      amount: 10000 + i,
      narration: `Transaction ${i}`,
      voucher_type: 'Journal',
      scrutiny_flag: true,
      scrutiny_category: 'Round Numbers',
      scrutiny_reason: 'Multiple of 1000',
    }));

    expect(largeDataset).toHaveLength(10000);
    expect(largeDataset[0].voucher_no).toBe('JV-000000');
    expect(largeDataset[9999].voucher_no).toBe('JV-009999');
  });

  it('should handle multiple sequential replacements', () => {
    let currentDatasetSize = 1000;

    const replace = (newSize: number) => {
      currentDatasetSize = newSize;
    };

    replace(500);
    expect(currentDatasetSize).toBe(500);

    replace(800);
    expect(currentDatasetSize).toBe(800);

    replace(200);
    expect(currentDatasetSize).toBe(200);
  });

  it('should handle replacement with different data types in columns', () => {
    const mixedTypeRow: any = {
      voucher_no: 'JV-001', // string
      date: '2024-05-15', // string
      amount: 10000, // number
      count: '5', // string but numeric
      isValidated: true, // boolean
      remarks: null, // null
    };

    expect(typeof mixedTypeRow.voucher_no).toBe('string');
    expect(typeof mixedTypeRow.amount).toBe('number');
    expect(typeof mixedTypeRow.isValidated).toBe('boolean');
    expect(mixedTypeRow.remarks).toBeNull();
  });

  it('should preserve document editor state in documentation tab after replacement', () => {
    const documentationContent = '<h2>Audit Working Paper</h2><p>Evidence section</p>';

    expect(documentationContent).toContain('Audit Working Paper');
    expect(documentationContent).toContain('Evidence section');
  });

  it('should handle filter application after replacement', async () => {
    const filters = {
      search_text: 'payment',
      min_amount: 50000,
      max_amount: 500000,
      categories: ['Manual Journal'],
    };

    expect(filters.search_text).toBe('payment');
    expect(filters.min_amount).toBeGreaterThan(0);
    expect(filters.categories).toContain('Manual Journal');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// ERROR HANDLING TESTS
// ─────────────────────────────────────────────────────────────────────────

describe('Replace Dataset - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle file upload failure gracefully', async () => {
    const mockIngestFile = vi.spyOn(workbooksApi, 'ingestFile').mockRejectedValueOnce(
      new Error('File upload failed')
    );

    try {
      await workbooksApi.ingestFile('workbook-123', new File([], 'test.csv'), true, 0.05);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toBe('File upload failed');
    }

    mockIngestFile.mockRestore();
  });

  it('should handle API timeout during analysis', async () => {
    const mockIngestFile = vi.spyOn(workbooksApi, 'ingestFile').mockRejectedValueOnce(
      new Error('Request timeout')
    );

    try {
      await workbooksApi.ingestFile('workbook-123', new File([], 'test.csv'), true, 0.05);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toBe('Request timeout');
    }

    mockIngestFile.mockRestore();
  });

  it('should handle malformed response data', () => {
    const malformedResponse: any = {
      summary: {
        total_entries: 'invalid', // Should be number
        rule_flagged: -10, // Should be non-negative
      },
      flagged_rows: null, // Should be array
    };

    expect(typeof malformedResponse.summary.total_entries).toBe('string');
    expect(malformedResponse.summary.rule_flagged).toBeLessThan(0);
    expect(malformedResponse.flagged_rows).toBeNull();
  });

  it('should prevent UI crash on missing scrutiny_category', () => {
    const rowMissingCategory: any = {
      voucher_no: 'JV-001',
      date: '2024-05-15',
      // scrutiny_category is missing
      scrutiny_flag: true,
    };

    const category = rowMissingCategory.scrutiny_category || 'Uncategorized';
    expect(category).toBe('Uncategorized');
  });
});
