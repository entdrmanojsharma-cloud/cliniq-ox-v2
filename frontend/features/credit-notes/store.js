/* 
  Purpose: Define Zustand state store for Credit Notes.
  Responsibility: Manage credit note records, trigger credits creation, and load credit lists.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useCreditNotesStore = create((set, get) => ({
  creditNotes: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchCreditNotes: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/credit-notes?${params}`);
      set({ creditNotes: data.creditNotes || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createCreditNote: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/credit-notes', payload);
      set({ loading: false });
      get().fetchCreditNotes();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
