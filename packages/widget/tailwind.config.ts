import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.ts", "./server/**/*.ts"],
  prefix: "tvw-",
  important: "#chaty-assistant-root",
  theme: {
    extend: {
      colors: {
        "travrse-primary": "var(--travrse-primary, #111827)",
        "travrse-secondary": "var(--travrse-secondary, #4b5563)",
        "travrse-surface": "var(--travrse-surface, #ffffff)",
        "travrse-muted": "var(--travrse-muted, #9ca3af)",
        "travrse-accent": "var(--travrse-accent, #2563eb)"
      },
      boxShadow: {
        floating: "0 30px 60px -15px rgba(15, 23, 42, 0.35)"
      },
      spacing: {
        18: "4.5rem"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      }
    }
  },
  corePlugins: {
    preflight: false
  },
  plugins: []
};

export default config;
