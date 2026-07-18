/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#132A3A",
          light: "#1D3A4F"
        },
        gold: {
          DEFAULT: "#B08D3F",
          light: "#D9C48F"
        },
        paper: "#EEF1EC",
        card: "#FFFFFF",
        rust: "#A6462E",
        moss: "#4E6B4C",
        slate: "#5B6B72",
        line: "#D8DDD5",
      },
      borderRadius: {
        btn: "3px",
        card: "8px",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      }
    },
  },
  plugins: [],
}
