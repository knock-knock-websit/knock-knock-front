import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#161616",
        paper: "#f5f1e8",
        acid: "#dcff47",
        lilac: "#c5baf9",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "PingFang TC", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
