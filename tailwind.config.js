/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        device: '0 24px 70px rgba(18, 18, 24, 0.28)',
        insetScreen: 'inset 0 0 0 2px rgba(255,255,255,0.28), inset 0 -16px 28px rgba(0,0,0,0.12)',
      },
      fontFamily: {
        display: ['Nunito', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        dex: {
          red: '#e3283e',
          redDark: '#a91325',
          shell: '#16171c',
          screen: '#f7fbff',
          ink: '#20212a',
          yellow: '#ffd643',
          blue: '#2f8cff',
          cyan: '#66d9ff',
        },
      },
    },
  },
  plugins: [],
}
