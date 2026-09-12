/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-gradient-to-b",
    "from-gray-400",
    "via-gray-200",
    "to-gray-600",
    "font-extrabold",
    "tracking-tighter",
    "text-transparent",
    "bg-clip-text",
    "pb-2",
    "pr-2",
    "gradient",
    "gradient-title"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}