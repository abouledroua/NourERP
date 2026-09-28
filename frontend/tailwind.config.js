/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981', // Emerald primary
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#102a43',
          900: '#0b1d3a', // Deep academic navy
        }
      },
      fontFamily: {
        arabic: ['Cairo', 'IBM Plex Sans Arabic', 'Tajawal', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalOverlay: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideSidebar: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideSidebarLtr: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.8, filter: 'brightness(1.2)' },
        }
      },
      animation: {
        'modal-enter': 'modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-overlay': 'modalOverlay 0.3s ease-out forwards',
        'sidebar-slide': 'slideSidebar 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'sidebar-slide-ltr': 'slideSidebarLtr 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
