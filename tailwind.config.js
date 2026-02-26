/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#00e6ff",
        amber: "#ffd166",
      },
    },
  },
  plugins: [],
};