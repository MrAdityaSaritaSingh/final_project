import { apiClient } from './client';

export const scrutinyApi = {
  // Analyze a file for anomalies
  analyze: async (file: File, useMl: boolean = true, contamination: number = 0.05) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ml', String(useMl));
    formData.append('contamination', String(contamination));
    return apiClient.postFormData('/api/scrutiny/analyze', formData);
  },

  // Preview the file schema mapping
  previewSchema: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postFormData('/api/scrutiny/schema-preview', formData);
  },

  // Export the report as Excel
  exportReport: async (file: File, useMl: boolean = true, contamination: number = 0.05, approved: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ml', String(useMl));
    formData.append('contamination', String(contamination));
    formData.append('approved', String(approved));
    return apiClient.postFormDataBlob('/api/scrutiny/export', formData);
  },
};
