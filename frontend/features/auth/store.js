import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `http://${window.location.hostname}:3000/api/v1`;
    }
    return 'http://localhost:3000/api/v1';
  }
  return 'http://192.168.0.124:3000/api/v1';
};

const BASE_URL = getBaseUrl();

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      accessToken: null,
      refreshToken: null,
      hospitalId: null,
      role: null,
      isAuthenticated: false,
      username: null,
      firstName: null,
      lastName: null,
      mustChangePassword: false,

      login: async (hospitalCode, username, password) => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Login failed');
        }
        const data = json.data;
        set({
          token: data.accessToken,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.role,
          hospitalId: data.hospitalId,
          isAuthenticated: true,
          username: username.trim(),
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          mustChangePassword: false
        });
        return data;
      },

      refreshAccessToken: async () => {
        const { refreshToken } = useAuthStore.getState();
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        const json = await res.json();
        if (!res.ok) {
          useAuthStore.getState().logout();
          throw new Error('Session expired');
        }
        set({ token: json.data.accessToken, accessToken: json.data.accessToken });
        return json.data.accessToken;
      },

      signup: async (hospitalCode, username, password, role) => {
        const code = hospitalCode || 'CLKOX';
        const res = await fetch(`${BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hospitalCode: code, username, password, role })
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Signup failed');
        }
        return json.data;
      },

      changePassword: async (newPassword) => {
        const { accessToken } = useAuthStore.getState();
        const res = await fetch(`${BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ newPassword })
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Password change failed');
        }
        set({ mustChangePassword: false });
        return json.data;
      },

      requestForgotPassword: async (username) => {
        const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Request failed');
        }
        return json.data;
      },

      logout: () => {
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          role: null,
          hospitalId: null,
          isAuthenticated: false,
          username: null,
          firstName: null,
          lastName: null,
          mustChangePassword: false
        });
      }
    }),
    {
      name: 'cliniqox-auth-storage',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch (e) {
          return {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
          };
        }
      })
    }
  )
);
