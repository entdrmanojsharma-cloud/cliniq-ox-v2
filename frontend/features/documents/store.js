/* 
  Purpose: Define Zustand state store for Document Generations.
  Responsibility: Manage logs of generated documents, revisions archives, and trigger PDF rendering actions.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useDocumentsStore = create((set, get) => ({
  generations: [],
  loading: false,
  fetchGenerations: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/documents'); // List generated documents
      set({ generations: data || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  generateDocument: async (documentType, targetId) => {
    set({ loading: true });
    try {
      const data = await api.post('/documents', { documentType, targetId });
      set({ loading: false });
      get().fetchGenerations();
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
