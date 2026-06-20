/* 
  Purpose: Define Zustand state store for Surgeries.
  Responsibility: Manage surgery catalog list, surgical details, and pricing master modifications.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useSurgeriesStore = create((set, get) => ({
  surgeries: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchSurgeries: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/surgeries?${params}`);
      set({ surgeries: data.surgeries || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  createSurgery: async (surgData) => {
    set({ loading: true });
    try {
      const newSurg = await api.post('/surgeries', surgData);
      set({ loading: false });
      get().fetchSurgeries();
      return newSurg;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateSurgery: async (id, surgData) => {
    set({ loading: true });
    try {
      const updated = await api.put(`/surgeries/${id}`, surgData);
      set({ loading: false });
      get().fetchSurgeries();
      return updated;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
