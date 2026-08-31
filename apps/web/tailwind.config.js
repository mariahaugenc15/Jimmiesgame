/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0b3d24",
        pitchLine: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
