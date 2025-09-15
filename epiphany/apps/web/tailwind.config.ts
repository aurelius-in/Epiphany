import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        panel: '#151517',
        panel2: '#101012',
        border: '#26262a',
        text: '#e6e6ea',
        muted: '#a4a4ad',
        accent1: '#FF007A',
        accent2: '#7A00FF',
        accent3: '#FF6A00',
      }
    }
  },
  plugins: [],
} satisfies Config
