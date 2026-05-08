import { apiClient } from './client';
import { authApi } from './authApi';
import type { Workbook, CreateWorkbookPayload } from '../types/workbook';

export type { Workbook, CreateWorkbookPayload };

function _token(): string {
  const token = authApi.getToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}
export const workbooksApi = {
  // List all workbooks for the current user
  listWorkbooks: async (): Promise<Workbook[]> => {
    return apiClient.get('/api/workbooks', _token());
  },

  // Create a new workbook
  createWorkbook: async (data: CreateWorkbookPayload): Promise<Workbook> => {
    return apiClient.post('/api/workbooks', data, _token());
  },

  // Get a specific workbook
  getWorkbook: async (workbookId: string): Promise<Workbook> => {
    return apiClient.get(`/api/workbooks/${workbookId}`, _token());
  },

  // Save entity configuration
  saveEntityConfig: async (workbookId: string, config: Record<string, any>): Promise<Workbook> => {
    return apiClient.put(`/api/workbooks/${workbookId}/entity-config`, config, _token());
  },

  // Ingest a file for analysis
  ingestFile: async (
    workbookId: string,
    file: File,
    useMl: boolean = true,
    contamination: number = 0.05
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ml', String(useMl));
    formData.append('contamination', String(contamination));

    return apiClient.postFormData(`/api/workbooks/${workbookId}/ingest`, formData, _token());
  },

  // Delete a workbook (soft delete)
  deleteWorkbook: async (workbookId: string): Promise<void> => {
    return apiClient.delete(`/api/workbooks/${workbookId}`, _token());
  },

  // Get paginated transactions for a workbook
  getTransactions: async (
    workbookId: string,
    page: number = 1,
    limit: number = 100,
    transactionType: string = 'review',
    params: Record<string, any> = {}
  ): Promise<{
    transactions: any[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> => {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      transaction_type: transactionType,
      ...params,
    });
    return apiClient.get(`/api/workbooks/${workbookId}/transactions?${queryParams.toString()}`, _token());
  },
};

