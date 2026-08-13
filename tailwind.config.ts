import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2B2A",
        "ink-soft": "#3A4A47",
        paper: "#F6F1E6",
        "paper-dim": "#ECE4D2",
        card: "#FBF8F1",
        line: "#D9CEB4",
        accent: "#B23A2E",
        "accent-dim": "#8f2e24",
        success: "#4B6B4E",
        warn: "#9C6B1E",
      },
      fontFamily: {
        sans: ["'Zen Kaku Gothic New'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        chit: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
