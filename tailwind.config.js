import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        xl: '3rem',
      },
    },
    extend: {
      colors: {
        brand: {
          25: '#f7f7ff',
          50: '#f1f3ff',
          100: '#e4e7ff',
          200: '#c7ccff',
          300: '#a9b1ff',
          400: '#7766ff',
          500: '#5f4bff',
          600: '#4c3bd4',
          700: '#3b2ea5',
          800: '#2a2075',
          900: '#1a1547',
        },
        neutral: {
          950: '#020617',
          900: '#0f172a',
          800: '#1f2937',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        accent: {
          teal: '#22d3ee',
          coral: '#ff6b6b',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
        display: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
        30: '7.5rem',
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.12)',
        soft: '0 24px 60px rgba(15, 23, 42, 0.16)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #5f4bff 0%, #22d3ee 100%)',
        'gradient-surface': 'radial-gradient(circle at top left, rgba(119, 102, 255, 0.2), rgba(34, 211, 238, 0.05))',
        'gradient-dark': 'linear-gradient(140deg, rgba(15, 23, 42, 1) 0%, rgba(26, 21, 71, 0.92) 45%, rgba(15, 23, 42, 1) 100%)',
      },
      backdropBlur: {
        18: '18px',
      },
      keyframes: {
        pulseCheck: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.12)', opacity: '0.85' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confettiPop: {
          '0%': { transform: 'translate3d(0,0,0) scale(0.6)', opacity: '1' },
          '100%': { transform: 'translate3d(var(--tw-confetti-x), var(--tw-confetti-y), 0) scale(0.6)', opacity: '0' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseCheck: 'pulseCheck 320ms ease-out',
        fadeSlideUp: 'fadeSlideUp 420ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
