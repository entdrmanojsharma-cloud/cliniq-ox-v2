import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const usePatientsStore = create((set, get) => ({
  patients: [],
  loading: false,
  page: 1,
  limit: 10,
  total: 0,
  search: '',
  pmjay: 'all',

  setFilters: (filters) => {
    set((state) => ({ ...state, ...filters }));
  },

  fetchPatients: async () => {
    set({ loading: true });
    try {
      const { page, limit, search, pmjay } = get();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(pmjay && pmjay !== 'all' && { pmjay })
      });
      const responseData = await api.get(`/patients?${params.toString()}`);
      // api.js returns response.json().data directly, which has { patients, meta }
      if (responseData) {
        set({
          patients: responseData.patients || [],
          total: responseData.meta?.total || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      set({ loading: false });
    }
  },

  createPatient: async (payload) => {
    try {
      const responseData = await api.post('/patients', payload);
      if (responseData) {
        await get().fetchPatients();
        return responseData;
      }
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw error;
    }
  },

  updatePatient: async (id, payload) => {
    try {
      const responseData = await api.put(`/patients/${id}`, payload);
      if (responseData) {
        await get().fetchPatients();
        return responseData;
      }
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error;
    }
  },

  deletePatient: async (id) => {
    try {
      await api.delete(`/patients/${id}`);
      await get().fetchPatients();
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error;
    }
  }
}));
