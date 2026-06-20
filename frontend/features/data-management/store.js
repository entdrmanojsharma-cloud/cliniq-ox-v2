/*
  Purpose: Define Zustand state store for Data Management.
  Responsibility: Manage spreadsheet validation previews, triggering bulk database import commits, downloading sample templates, and fetching import logs history.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';
import { useAuthStore } from '../auth/store';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `http://${window.location.hostname}:3000/api/v1`;
    }
    return 'http://localhost:3000/api/v1';
  }
  return 'http://192.168.0.124:3000/api/v1';
};

const BASE_URL = getBaseUrl();

export const useDataManagementStore = create((set, get) => ({
  history: [],
  validationReport: null,
  loading: false,
  error: null,

  fetchHistory: async (importType) => {
    set({ loading: true, error: null });
    try {
      const endpoint = importType 
        ? `/data-management/history?importType=${importType}` 
        : '/data-management/history';
      const data = await api.get(endpoint);
      set({ history: data || [], loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  validateImport: async (importType, base64Data) => {
    set({ loading: true, error: null, validationReport: null });
    try {
      const data = await api.post('/data-management/validate', {
        importType,
        fileData: base64Data
      });
      set({ validationReport: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  commitImport: async (importType, fileName, validatedData) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/data-management/import', {
        importType,
        fileName,
        validatedData
      });
      set({ validationReport: null, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  downloadTemplate: async (importType) => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      const hospitalId = useAuthStore.getState().hospitalId;

      const res = await fetch(`${BASE_URL}/data-management/sample?importType=${importType}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(hospitalId && { 'x-hospital-id': hospitalId })
        }
      });

      if (!res.ok) {
        throw new Error('Failed to download template file');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importType.toLowerCase()}_master_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  clearValidationReport: () => {
    set({ validationReport: null, error: null });
  }
}));
