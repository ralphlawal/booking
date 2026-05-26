/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e5e4ff',
          200: '#cdc9fe',
          300: '#aba5fd',
          400: '#8678fa',
          500: '#6955f5',
          600: '#5b3eea',
          700: '#4e2ed0',
          800: '#4127a9',
          900: '#372486',
          950: '#1e1356', 
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 6px 0 rgb(0 0 0 / 0.05)',
        'card-hover': '0 8px 24px 0 rgb(0 0 0 / 0.1), 0 2px 8px 0 rgb(0 0 0 / 0.06)',
        primary: '0 4px 14px 0 rgb(91 62 234 / 0.28)',
        modal: '0 24px 60px -8px rgb(0 0 0 / 0.28), 0 0 0 1px rgb(0 0 0 / 0.04)',
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom, 0px)',
        },
      });
    },
  ],
};
