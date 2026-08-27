/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
          blue: '#0284c7',
          deep: '#0369a1',
        }
      }
    },
  },
  plugins: [],
}
