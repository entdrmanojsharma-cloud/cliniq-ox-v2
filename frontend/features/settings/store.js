/* 
  Purpose: Define Zustand state store for Hospital Profile Settings.
  Responsibility: Manage tenant profile settings, update numbering prefixes, and edit base currency/GST rates.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useSettingsStore = create((set, get) => ({
  profile: null,
  loading: false,
  fetchProfile: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/hospital-profile');
      set({ profile: data, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  updateProfile: async (payload) => {
    set({ loading: true });
    try {
      const updated = await api.put('/hospital-profile', payload);
      set({ profile: updated, loading: false });
      return updated;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  billingDefaults: null,
  fetchBillingDefaults: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/billing-defaults');
      set({ billingDefaults: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  updateBillingDefaults: async (payload) => {
    set({ loading: true });
    try {
      const updated = await api.put('/billing-defaults', payload);
      set({ billingDefaults: updated, loading: false });
      return updated;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
