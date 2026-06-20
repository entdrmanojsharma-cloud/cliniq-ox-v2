import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: null,
  showAlert: (title, message, buttons) => {
    set({
      visible: true,
      title: title || 'Alert',
      message: message || '',
      buttons: buttons || null
    });
  },
  hideAlert: () => {
    set({
      visible: false,
      title: '',
      message: '',
      buttons: null
    });
  }
}));
