/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        border: '#E5E5E5',
        'border-strong': '#000000',
        surface: '#FFFFFF',
        sidebar: '#000000',
        invest: { DEFAULT: '#16A34A', light: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
        watch: { DEFAULT: '#D97706', light: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
        danger: { DEFAULT: '#DC2626', light: '#FFF1F1', border: '#FECACA', text: '#B91C1C' },
      },
    },
  },
  plugins: [],
}
