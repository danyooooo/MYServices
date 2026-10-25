/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        dani: {
          bg: '#08090e',
          surface: '#121622',
          gold: '#fbbf24',
          ochre: '#d97706',
          rose: '#f43f5e',
          emerald: '#10b981',
          amber: '#f59e0b',
          purple: '#a855f7',
        },
      },
      boxShadow: {
        'glass-inset': 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 16px 40px -10px rgba(0, 0, 0, 0.5)',
        'glass-glow': 'inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 20px 45px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(251, 191, 36, 0.15)',
        'pill-dock': 'inset 0 1px 1px rgba(255, 255, 255, 0.28), 0 16px 40px -10px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'drift-1': 'driftOrb1 18s ease-in-out infinite',
        'drift-2': 'driftOrb2 22s ease-in-out infinite',
        'drift-3': 'driftOrb3 20s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        driftOrb1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, 30px) scale(1.08)' },
        },
        driftOrb2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-35px, 45px) scale(0.95)' },
        },
        driftOrb3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -40px) scale(1.05)' },
        },
      }
    },
  },
  plugins: [],
}
