/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a',
        },
        indigo: {
          950: '#1e1b4b',
        },
      },
      boxShadow: {
        card: '0 12px 40px -20px rgba(79, 70, 229, 0.35)',
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
      },
      animation: {
        pulseCheck: 'pulseCheck 320ms ease-out',
      },
    },
  },
  plugins: [],
}
