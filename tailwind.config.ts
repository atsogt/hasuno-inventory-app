import type { Config } from "tailwindcss";

function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: withOpacity("--ink"),
        "ink-soft": withOpacity("--ink-soft"),
        paper: withOpacity("--paper"),
        "paper-dim": withOpacity("--paper-dim"),
        card: withOpacity("--card"),
        line: withOpacity("--line"),
        accent: withOpacity("--accent"),
        "accent-dim": withOpacity("--accent-dim"),
        "accent-deep": withOpacity("--accent-deep"),
        urgent: withOpacity("--urgent"),
        success: withOpacity("--success"),
        warn: withOpacity("--warn"),
        gold: withOpacity("--gold"),
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
