/* 
  Purpose: Define Zustand state store for Receipts.
  Responsibility: Manage payments receipts, log transactions, and trigger advance balance deposits.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useReceiptsStore = create((set, get) => ({
  receipts: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchReceipts: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/receipts?${params}`);
      set({ receipts: data.receipts || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createReceipt: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/receipts', payload);
      set({ loading: false });
      get().fetchReceipts();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
