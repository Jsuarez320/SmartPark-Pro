import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand-primary)",
          hover: "var(--color-brand-hover)",
          bright: "var(--color-brand-bright)",
          dark: "var(--color-brand-dark)",
        },
        vehicle: {
          auto: "var(--color-vehicle-auto)",
          moto: "var(--color-vehicle-moto)",
          ev: "var(--color-vehicle-ev)",
          pmr: "var(--color-vehicle-pmr)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
          light: "var(--color-destructive-light)",
          border: "var(--color-destructive-border)",
          hover: "var(--color-destructive-hover)",
        },
        surface: "var(--color-surface)",
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
          dashed: "var(--color-border-dashed)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;

export default config;
