/* 
  Purpose: Define Zustand state store for Advance Balances.
  Responsibility: Manage patient advance balances, load ledger lists, and fetch transaction history.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useAdvanceBalancesStore = create((set) => ({
  balanceDetails: null,
  ledgerEntries: [],
  loading: false,

  fetchBalanceDetails: async (patientId, estimateId) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams({
        patientId,
        ...(estimateId && { estimateId })
      }).toString();
      const data = await api.get(`/advance-balances/details?${params}`);
      set({ balanceDetails: data, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },

  fetchLedgerHistory: async (patientId, estimateId) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams({
        patientId,
        ...(estimateId && { estimateId })
      }).toString();
      const data = await api.get(`/advance-balances/history?${params}`);
      set({ ledgerEntries: data || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  }
}));
