/* 
  Purpose: Define Zustand state store for Calendar.
  Responsibility: Manage booking events, active date selections, and API transactions.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export const useCalendarStore = create((set, get) => ({
  events: [],
  loading: false,
  selectedDate: getTodayString(),
  weekStartDate: getTodayString(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setWeekStartDate: (date) => set({ weekStartDate: date }),
  
  nextWeek: () => {
    const { weekStartDate } = get();
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    const newDateStr = d.toISOString().split('T')[0];
    set({ weekStartDate: newDateStr, selectedDate: newDateStr });
    get().fetchEvents();
  },
  
  prevWeek: () => {
    const { weekStartDate } = get();
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    const newDateStr = d.toISOString().split('T')[0];
    set({ weekStartDate: newDateStr, selectedDate: newDateStr });
    get().fetchEvents();
  },

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const { weekStartDate } = get();
      const start = new Date(weekStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      const data = await api.get(`/calendar?startFrom=${start.toISOString()}&startTo=${end.toISOString()}&limit=200`);
      set({ events: data.events || [], loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  createEvent: async (eventData) => {
    set({ loading: true });
    try {
      const newEvent = await api.post('/calendar', eventData);
      set({ loading: false });
      get().fetchEvents();
      return newEvent;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  updateEvent: async (id, eventData) => {
    set({ loading: true });
    try {
      const updated = await api.put(`/calendar/${id}`, eventData);
      set({ loading: false });
      get().fetchEvents();
      return updated;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  deleteEvent: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/calendar/${id}`);
      set({ loading: false });
      get().fetchEvents();
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
