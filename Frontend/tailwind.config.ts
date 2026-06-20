import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0f766e" },
        moto: { DEFAULT: "#ef4444" },
        ev: { DEFAULT: "#16a34a" },
        pmr: { DEFAULT: "#9333ea" },
        caja: { DEFAULT: "#f43f5e" }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;

export default config;
