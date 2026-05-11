/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cosmos: {
          deep: '#02030a',
          night: '#070918',
          panel: 'rgba(8, 10, 24, 0.55)',
          accent: '#9bb0ff',
          glow: '#ffd27a',
        },
      },
    },
  },
  plugins: [],
}
