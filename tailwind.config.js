/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563EB', dark: '#1E3A8A', light: '#EFF6FF' },
        success: '#16A34A',
        warning: '#F59E0B',
        urgent: '#DC2626',
        ink: '#1F2937',
        surface: '#F8FAFC',
        night: { DEFAULT: '#0B1220', card: '#111a2e', border: '#1f2a44' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)',
        fab: '0 8px 24px rgba(37,99,235,0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
