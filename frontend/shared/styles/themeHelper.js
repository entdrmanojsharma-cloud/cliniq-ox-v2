/* 
  Purpose: Define theme helper utility and Zustand store for managing app colors dynamically.
  Responsibility: Provide high-contrast color palettes (Dark, Light, Ocean Breeze, Forest Healing) and apply CSS variables.
*/

import { create } from 'zustand';
import { Platform } from 'react-native';

export const THEME_PALETTES = {
  dark: {
    '--background': '#0f172a',
    '--surface': '#1e293b',
    '--border': '#334155',
    '--text': '#f8fafc',
    '--text-muted': '#cbd5e1', // bright slate for high contrast
    '--primary': '#6366f1',
    '--primary-light': '#a5b4fc',
    '--accent': '#f472b6',
    '--success': '#34d399',
    '--warning': '#f59e0b',
    '--danger': '#ef4444'
  },
  light: {
    '--background': '#f8fafc',
    '--surface': '#ffffff',
    '--border': '#cbd5e1',
    '--text': '#0f172a', // high contrast slate 900
    '--text-muted': '#475569', // high contrast slate 600
    '--primary': '#4f46e5',
    '--primary-light': '#312e81',
    '--accent': '#db2777',
    '--success': '#059669',
    '--warning': '#d97706',
    '--danger': '#dc2626'
  },
  ocean: {
    '--background': '#082f49', // sky 950
    '--surface': '#0f172a', // slate 900
    '--border': '#0284c7', // sky 600
    '--text': '#f0f9ff', // sky 50
    '--text-muted': '#bae6fd', // sky 200 for high contrast
    '--primary': '#06b6d4', // cyan 500
    '--primary-light': '#67e8f9',
    '--accent': '#fb7185',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
    '--danger': '#ef4444'
  },
  forest: {
    '--background': '#022c22', // emerald 950
    '--surface': '#064e3b', // emerald 900
    '--border': '#047857', // emerald 700
    '--text': '#ecfdf5', // emerald 50
    '--text-muted': '#a7f3d0', // emerald 200 for high contrast
    '--primary': '#10b981', // emerald 500
    '--primary-light': '#6ee7b7',
    '--accent': '#f59e0b',
    '--success': '#34d399',
    '--warning': '#fbbf24',
    '--danger': '#f87171'
  }
};

export const applyTheme = (themeName) => {
  if (Platform.OS !== 'web') return;
  const palette = THEME_PALETTES[themeName] || THEME_PALETTES.dark;
  Object.entries(palette).forEach(([key, val]) => {
    document.documentElement.style.setProperty(key, val);
  });
  // Also set body background directly so Expo's root wrapper picks up the change
  if (document.body) {
    document.body.style.backgroundColor = palette['--background'] || '#0f172a';
    document.body.style.color = palette['--text'] || '#f8fafc';
  }
};

export const useThemeStore = create((set) => ({
  activeTheme: 'dark',
  setTheme: (themeName) => {
    set({ activeTheme: themeName });
    applyTheme(themeName);
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('cliniqox_theme', themeName);
      } catch (e) {
        console.error('Failed to save theme in localStorage', e);
      }
    }
  },
  initTheme: () => {
    let savedTheme = 'dark';
    if (Platform.OS === 'web') {
      try {
        savedTheme = localStorage.getItem('cliniqox_theme') || 'dark';
      } catch (e) {
        console.error('Failed to read theme from localStorage', e);
      }
    }
    set({ activeTheme: savedTheme });
    applyTheme(savedTheme);
  }
}));
