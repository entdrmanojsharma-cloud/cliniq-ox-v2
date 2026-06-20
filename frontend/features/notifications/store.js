/* 
  Purpose: Define Zustand state store for Notifications.
  Responsibility: Manage fetching, marking read, and unread badges.
*/

import { create } from 'zustand';
import { api } from '../../shared/utils/api';

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  total: 0,
  page: 1,
  limit: 20,

  fetchNotifications: async (reset = false) => {
    set({ loading: true });
    try {
      const { page, limit, notifications } = get();
      const currentPage = reset ? 1 : page;
      
      const data = await api.get(`/notifications?page=${currentPage}&limit=${limit}`);
      
      const newNotifications = reset 
        ? (data.notifications || []) 
        : [...notifications, ...(data.notifications || [])];

      // Remove duplicates by ID just in case
      const uniqueNotifications = Array.from(
        new Map(newNotifications.map(item => [item.id, item])).values()
      );

      set({
        notifications: uniqueNotifications,
        total: data.total || 0,
        page: currentPage,
        loading: false
      });

      // Also refresh the unread count
      get().fetchUnreadCount();
    } catch (err) {
      set({ loading: false });
      console.error('Failed to fetch notifications:', err);
    }
  },

  fetchNextPage: () => {
    const { page, total, limit, loading } = get();
    if (loading) return;
    if (page * limit < total) {
      set({ page: page + 1 });
      get().fetchNotifications(false);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.get('/notifications?isRead=false&limit=1');
      set({ unreadCount: data.total || 0 });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      
      // Update local state
      set((state) => {
        const updatedNotifs = state.notifications.map((n) => 
          n.id === id ? { ...n, isRead: true } : n
        );
        const newUnreadCount = Math.max(0, state.unreadCount - 1);
        return {
          notifications: updatedNotifs,
          unreadCount: newUnreadCount
        };
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post('/notifications/read-all');
      
      // Update local state
      set((state) => {
        const updatedNotifs = state.notifications.map((n) => ({ ...n, isRead: true }));
        return {
          notifications: updatedNotifs,
          unreadCount: 0
        };
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }
}));
