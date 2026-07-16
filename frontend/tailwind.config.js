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
        card:         '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        primary:      '0 4px 14px 0 rgb(91 62 234 / 0.35)',
        'glow-primary':  '0 0 24px rgba(91,62,234,0.28)',
        'glow-emerald':  '0 0 24px rgba(52,211,153,0.28)',
        'glow-amber':    '0 0 24px rgba(251,191,36,0.28)',
        'glow-blue':     '0 0 24px rgba(59,130,246,0.28)',
        'inner-white':   'inset 0 1px 0 rgba(255,255,255,0.12)',
        'float':         '0 8px 32px rgba(0,0,0,0.12)',
        'nav':           '0 -4px 24px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-bottom': 'slideInBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right':  'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':     'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in':    'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInBottom: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          from: { opacity: '0', transform: 'scale(0.6)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(91,62,234,0)' },
          '50%':      { boxShadow: '0 0 24px 6px rgba(91,62,234,0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
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
