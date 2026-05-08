import { X, Loader2, ChevronDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { workbooksApi } from '../../api/workbooksApi';

interface DatasetReviewPanelProps {
  onClose: () => void;
  workbookId?: string;
  columnMappings?: Record<string, string>;
}

const PAGE_SIZE = 100;

export default function DatasetReviewPanel({
  onClose,
  workbookId,
  columnMappings = {},
}: DatasetReviewPanelProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async (pageNum: number, isInitial = false) => {
    if (!workbookId) return;
    
    try {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const data = await workbooksApi.getTransactions(workbookId, pageNum, PAGE_SIZE, 'review');
      
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (isInitial) {
        setRows(data);
        if (data.length > 0) {
          setColumns(Object.keys(data[0]));
        }
      } else {
        setRows(prev => [...prev, ...data]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [workbookId]);

  useEffect(() => {
    fetchRows(1, true);
  }, [fetchRows]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRows(nextPage);
    }
  };

  const rowCount = rows.length;
  const columnCount = columns.length;

  const mappingsList = columnMappings
    ? Object.entries(columnMappings).map(([systemField, sourceCol]) => ({
        source: sourceCol,
        mapped: systemField,
      }))
    : [];

  const previewRows = rows.slice(0, 3);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[800px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg text-gray-900 font-medium">Dataset Review</h2>
            <p className="text-sm text-gray-500 mt-1">Paginated view of transactions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">File Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Rows:</span>
                <span className="text-gray-900">{rowCount.toLocaleString()}{!hasMore ? '' : '+'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Columns:</span>
                <span className="text-gray-900">{columnCount}</span>
              </div>
            </div>
          </div>

          {mappingsList.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Column Mappings</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">Source Column</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">Mapped To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingsList.map((mapping, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 text-sm text-gray-700">{mapping.source}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{mapping.mapped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#095859] mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading data...</p>
            </div>
          ) : previewRows.length > 0 ? (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Data Preview (Showing {rowCount.toLocaleString()} rows)
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {columns.slice(0, 6).map((col) => (
                            <th key={col} className="px-3 py-2 text-left text-xs text-gray-600 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t border-gray-200">
                            {columns.slice(0, 6).map((col) => (
                              <td key={`${rowIndex}-${col}`} className="px-3 py-2 text-gray-700 whitespace-nowrap truncate">
                                {String(row[col] || '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        Load More Rows
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No data available.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}