import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#0D0E11",
        alabaster: "#F9F6F0",
        champagne: "#C5A059",
        bronze: "#A6823C",
        burgundy: "#7A1C24",
        charcoal: "#1E1E24",
        pearl: "#EAE6DF",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 20px 50px rgba(13, 14, 17, 0.08)",
        "luxury-dark": "0 24px 60px rgba(0, 0, 0, 0.45)",
        gold: "0 10px 30px rgba(197, 160, 89, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

