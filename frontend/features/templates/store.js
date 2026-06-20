/* 
  Purpose: Define Zustand state store for Estimate Templates.
  Responsibility: Manage template libraries, custom items lists, and templates fetching.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useTemplatesStore = create((set, get) => ({
  templates: [],
  loading: false,
  fetchTemplates: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/estimate-templates');
      set({ templates: data.templates || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createTemplate: async (payload) => {
    await api.post('/estimate-templates', payload);
    get().fetchTemplates();
  },
  updateTemplate: async (id, payload) => {
    await api.put(`/estimate-templates/${id}`, payload);
    get().fetchTemplates();
  },
  deleteTemplate: async (id) => {
    await api.delete(`/estimate-templates/${id}`);
    get().fetchTemplates();
  }
}));
