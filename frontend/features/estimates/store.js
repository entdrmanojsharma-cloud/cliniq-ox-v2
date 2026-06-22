/* 
  Purpose: Define Zustand state store for Estimates.
  Responsibility: Manage surgery estimates, run validation and calculation triggers, and fetch revision versions.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useEstimatesStore = create((set, get) => ({
  estimates: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  status: '',
  setFilters: (filters) => set(filters),
  fetchEstimates: async () => {
    set({ loading: true });
    try {
      const { search, status, page, limit } = get();
      const queryParams = {
        page: String(page),
        limit: String(limit),
        search
      };
      if (status) {
        queryParams.status = status;
      }
      const params = new URLSearchParams(queryParams).toString();
      const data = await api.get(`/estimates?${params}`);
      set({ estimates: data.estimates || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  createEstimate: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/estimates', payload);
      set({ loading: false });
      get().fetchEstimates();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateEstimate: async (id, payload) => {
    set({ loading: true });
    try {
      const res = await api.put(`/estimates/${id}`, payload);
      set({ loading: false });
      get().fetchEstimates();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateStatus: async (id, status, remarks) => {
    set({ loading: true });
    try {
      const res = await api.patch(`/estimates/${id}/status`, { status, remarks });
      set(state => ({
        estimates: state.estimates.map(e => e.id === id ? { ...e, ...res } : e),
        loading: false
      }));
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
