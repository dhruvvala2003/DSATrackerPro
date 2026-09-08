/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: { primary: "#F06F5E", secondary: "#B9DED1", accent: "#F4D36E", dark: "#1D2528", darkCard: "#FFFDF8" },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
