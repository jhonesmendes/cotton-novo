/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        ui: {
          primary: '#15803d',
          'primary-hover': '#166534',
          'primary-active': '#14532d',
          secondary: '#0f766e',
          background: '#f8fafc',
          surface: '#ffffff',
          muted: '#f1f5f9',
          border: '#e2e8f0',
          'border-subtle': '#f1f5f9',
          text: '#0f172a',
          'text-muted': '#64748b',
          disabled: '#94a3b8',
          success: '#15803d', warning: '#b45309', danger: '#dc2626', info: '#2563eb',
        },
        cotton: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        urgency: {
          vencido: '#ef4444',
          hoje: '#ef4444',
          critico: '#f97316',
          alerta: '#eab308',
          monitorar: '#3b82f6',
          ok: '#22c55e',
        },
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 28px rgba(15, 23, 42, 0.12)',
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      borderRadius: { 'ui-sm': '6px', 'ui-md': '10px', 'ui-lg': '14px', 'ui-xl': '18px' },
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
