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
        kahoot: {
          red:    "#e21b3c",
          blue:   "#1368ce",
          yellow: "#d89e00",
          green:  "#26890c",
          purple: "#46178f",
          dark:   "#1a1a2e",
        },
      },
      animation: {
        "bounce-in": "bounceIn 0.5s ease-out",
        "slide-up":  "slideUp 0.4s ease-out",
      },
      keyframes: {
        bounceIn: {
          "0%":   { transform: "scale(0.3)", opacity: "0" },
          "50%":  { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;