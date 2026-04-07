import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        aurora:
          "0 0 0 1px rgba(168,85,247,0.18), 0 0 28px rgba(168,85,247,0.22), 0 0 64px rgba(168,85,247,0.18)",
        paper:
          "0 1px 0 rgba(255,255,255,0.72), 0 18px 50px rgba(24,24,27,0.08), 0 2px 12px rgba(24,24,27,0.05)",
        obsidian:
          "0 0 0 1px rgba(245,158,11,0.08), 0 24px 80px rgba(0,0,0,0.42)",
      },
      colors: {
        chronos: {
          canvas: "#060816",
          violet: "#A855F7",
          mist: "#0B1120",
          paper: "#FBFBF9",
          obsidian: "#050505",
          amber: "#F59E0B",
          amberDeep: "#D97706",
        },
      },
      fontFamily: {
        display: ["'Archivo'", "'Space Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Cascadia Code'", "monospace"],
      },
    },
  },
};

export default config;
