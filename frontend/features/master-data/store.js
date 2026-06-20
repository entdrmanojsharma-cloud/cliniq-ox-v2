/* 
  Purpose: Define Zustand state store for Master Data.
  Responsibility: Manage OT Rooms, Patient Rooms, Hospital Charges, and Pending Charge Approval cycles.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useMasterDataStore = create((set, get) => ({
  otRooms: [],
  rooms: [],
  hospitalCharges: [],
  pendingCharges: [],
  diagnosisMasters: [],
  loading: false,

  fetchDiagnosisMasters: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/diagnosis-master');
      set({ diagnosisMasters: data || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createDiagnosisMaster: async (diagnosisData) => {
    await api.post('/diagnosis-master', diagnosisData);
    get().fetchDiagnosisMasters();
  },

  fetchOtRooms: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/ot-rooms');
      set({ otRooms: data.rooms || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createOtRoom: async (roomData) => {
    await api.post('/ot-rooms', roomData);
    get().fetchOtRooms();
  },

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/rooms');
      set({ rooms: data.rooms || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createRoom: async (roomData) => {
    await api.post('/rooms', roomData);
    get().fetchRooms();
  },

  fetchHospitalCharges: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/hospital-charges');
      set({ hospitalCharges: data.charges || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createHospitalCharge: async (chargeData) => {
    await api.post('/hospital-charges', chargeData);
    get().fetchHospitalCharges();
  },

  fetchPendingCharges: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/pending-master-charges');
      set({ pendingCharges: data.charges || [], loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  createPendingCharge: async (chargeData) => {
    await api.post('/pending-master-charges', chargeData);
    get().fetchPendingCharges();
  },
  approvePendingCharge: async (id) => {
    await api.post(`/pending-master-charges/${id}/approve`);
    get().fetchPendingCharges();
  },
  rejectPendingCharge: async (id) => {
    await api.post(`/pending-master-charges/${id}/reject`);
    get().fetchPendingCharges();
  }
}));
