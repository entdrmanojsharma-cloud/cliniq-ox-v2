/* 
  Purpose: Define Zustand state store for Invoices.
  Responsibility: Manage billing invoices, load lists with filters, and trigger finalization/cancellation.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useInvoicesStore = create((set, get) => ({
  invoices: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchInvoices: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/invoices?${params}`);
      set({ invoices: data.invoices || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createInvoice: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/invoices', payload);
      set({ loading: false });
      get().fetchInvoices();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateInvoice: async (id, payload) => {
    set({ loading: true });
    try {
      const res = await api.put(`/invoices/${id}`, payload);
      set({ loading: false });
      get().fetchInvoices();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  finalizeInvoice: async (id) => {
    set({ loading: true });
    try {
      const res = await api.post(`/invoices/${id}/finalize`);
      set({ loading: false });
      get().fetchInvoices();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  cancelInvoice: async (id) => {
    set({ loading: true });
    try {
      const res = await api.post(`/invoices/${id}/cancel`);
      set({ loading: false });
      get().fetchInvoices();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  allocatePayment: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/payment-allocations', payload);
      set({ loading: false });
      get().fetchInvoices();
      return res;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
