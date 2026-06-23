/* 
  Purpose: Manage global Toast Notification State.
  Responsibility: Provide showToast and hideToast triggers to render non-blocking on-screen notifications.
*/

import { create } from 'zustand';

export const useToastStore = create((set) => ({
  visible: false,
  message: '',
  type: 'success', // 'success' | 'info' | 'warning'
  showToast: (message, type = 'success', duration = 2500) => {
    set({
      visible: true,
      message,
      type
    });
    
    // Clear any existing timeout to avoid premature dismissal
    if (useToastStore.timeoutId) {
      clearTimeout(useToastStore.timeoutId);
    }
    
    useToastStore.timeoutId = setTimeout(() => {
      set({ visible: false, message: '', type: 'success' });
    }, duration);
  },
  hideToast: () => {
    if (useToastStore.timeoutId) {
      clearTimeout(useToastStore.timeoutId);
    }
    set({ visible: false, message: '', type: 'success' });
  }
}));

useToastStore.timeoutId = null;
