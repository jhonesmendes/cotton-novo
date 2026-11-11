import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
export type Paleta = 'VERDE' | 'AZUL';
export type Estilo = 'CLASSICO' | 'CONTROLE' | 'LAVOURA' | 'EXECUTIVO';
const ESTILOS: Estilo[] = ['CLASSICO', 'CONTROLE', 'LAVOURA', 'EXECUTIVO'];

interface ThemeState {
  theme: Theme;
  // Paleta salva no usuário (Minha conta); aqui fica o cache para abrir já na cor certa.
  paleta: Paleta;
  setPaleta: (paleta: Paleta) => void;
  // Estilo visual do painel (styles/estilos.css).
  estilo: Estilo;
  setEstilo: (estilo: Estilo) => void;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function applyPaleta(paleta: Paleta) {
  document.documentElement.classList.toggle('tema-verde', paleta === 'VERDE');
}

function applyEstilo(estilo: Estilo) {
  for (const e of ESTILOS) document.documentElement.classList.toggle(`estilo-${e.toLowerCase()}`, e === estilo && e !== 'CLASSICO');
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
      paleta: 'AZUL',
      estilo: 'CLASSICO',
      setEstilo: (estilo) => {
        applyEstilo(estilo);
        set({ estilo });
      },
      setPaleta: (paleta) => {
        applyPaleta(paleta);
        set({ paleta });
      },
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
        if (state) {
          applyClass(state.theme);
          applyPaleta(state.paleta ?? 'AZUL');
          applyEstilo(state.estilo ?? 'CLASSICO');
        }
      },
    },
  ),
);
