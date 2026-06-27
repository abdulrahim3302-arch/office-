/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0a0f',
          900: '#111118',
          800: '#1a1a24',
          750: '#1e1e2e',
          700: '#252535',
          600: '#32324a',
          500: '#4a4a6a',
          400: '#7070a0',
          300: '#9090c0',
          200: '#c0c0e0',
          100: '#e0e0f0',
        },
      },
    },
  },
  plugins: [],
};
