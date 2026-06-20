/* 
  Purpose: Define Zustand state store for Refunds.
  Responsibility: Manage payouts refunds, check advance balance limitations, and trigger ledger deduct transactions.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useRefundsStore = create((set, get) => ({
  refunds: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchRefunds: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/refunds?${params}`);
      set({ refunds: data.refunds || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createRefund: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/refunds', payload);
      set({ loading: false });
      get().fetchRefunds();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
