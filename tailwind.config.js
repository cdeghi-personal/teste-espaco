/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:         '#1B3FAB',
          'blue-dark':  '#132d7a',
          'blue-light': '#2d55d4',
          yellow:       '#F5C300',
          'yellow-dark':'#d4a800',
          'yellow-light':'#ffd633',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
