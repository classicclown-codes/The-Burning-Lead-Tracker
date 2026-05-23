/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1D9E75',
        ink: '#101828',
        line: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px rgba(16, 24, 40, 0.12)',
      },
    },
  },
  plugins: [],
};
