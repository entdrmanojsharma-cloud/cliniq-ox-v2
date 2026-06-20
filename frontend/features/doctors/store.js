/* 
  Purpose: Define Zustand state store for Doctors.
  Responsibility: Maintain loading state, doctor profiles list, and updates.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useDoctorsStore = create((set, get) => ({
  doctors: [],
  loading: false,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  setFilters: (filters) => set(filters),
  fetchDoctors: async () => {
    set({ loading: true });
    try {
      const { search, page, limit } = get();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search
      }).toString();
      const data = await api.get(`/doctors?${params}`);
      set({ doctors: data.doctors || [], total: data.meta?.total || 0, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  createDoctor: async (doctorData) => {
    set({ loading: true });
    try {
      const newDoc = await api.post('/doctors', doctorData);
      set({ loading: false });
      get().fetchDoctors();
      return newDoc;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateDoctor: async (id, doctorData) => {
    set({ loading: true });
    try {
      const updated = await api.put(`/doctors/${id}`, doctorData);
      set({ loading: false });
      get().fetchDoctors();
      return updated;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
