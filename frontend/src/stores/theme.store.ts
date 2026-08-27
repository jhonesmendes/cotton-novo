import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function systemPreference(): Theme {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemPreference(),
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyClass(next);
        set({ theme: next });
      },
      setTheme: (theme) => {
        applyClass(theme);
        set({ theme });
      },
    }),
    {
      name: 'cotton-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyClass(state.theme);
      },
    },
  ),
);
