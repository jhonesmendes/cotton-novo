// Cores, fontes, cantos e sombras vêm de variáveis CSS definidas por estilo
// (Clássico / Controle / Lavoura / Executivo) e modo claro/escuro — ver
// src/styles/estilos.css. Valores em canais RGB para o Tailwind aplicar opacidade.
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;
const escala = (prefixo) => Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, v(`${prefixo}-${n}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
        ui: {
          // Cor principal vem do tema do usuário (Verde/Azul) — ver styles/globals.css.
          primary: 'rgb(var(--ui-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--ui-primary-hover) / <alpha-value>)',
          'primary-active': 'rgb(var(--ui-primary-active) / <alpha-value>)',
          secondary: '#0f766e',
          background: v('c-canvas'),
          surface: v('c-surface'),
          muted: v('g-50'),
          border: v('g-200'),
          'border-subtle': v('g-100'),
          text: v('g-900'),
          'text-muted': v('g-500'),
          disabled: v('g-400'),
          success: '#15803d', warning: '#b45309', danger: '#dc2626', info: '#2563eb',
        },
        // Cinzas semânticos: no modo escuro a escala inverte (50 = mais escuro).
        gray: escala('g'),
        slate: { ...escala('g'), 950: '#020617' },
        // A escala "indigo" usada nas telas (destaques, chips, menu ativo) segue o tema.
        indigo: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, `rgb(var(--tema-${n}) / <alpha-value>)`])),
        urgency: {
          vencido: '#ef4444',
          hoje: '#ef4444',
          critico: '#f97316',
          alerta: '#eab308',
          monitorar: '#3b82f6',
          ok: '#22c55e',
        },
      },
      borderColor: { DEFAULT: 'rgb(var(--g-200))' },
      boxShadow: {
        sm: 'var(--sh-sm)',
        md: 'var(--sh-md)',
        lg: 'var(--sh-lg)',
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      borderRadius: {
        DEFAULT: 'var(--r-sm)', lg: 'var(--r-lg)', xl: 'var(--r-xl)', '2xl': 'var(--r-2xl)',
        'ui-sm': 'var(--ru-sm)', 'ui-md': 'var(--ru-md)', 'ui-lg': 'var(--ru-lg)', 'ui-xl': 'var(--ru-xl)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
