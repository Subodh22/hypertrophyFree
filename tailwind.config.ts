import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
      colors: {
        background: "#1a1a1a",
        neon: {
          green: "#00ff88",
          green100: "rgba(0, 255, 136, 0.1)",
          green200: "rgba(0, 255, 136, 0.2)",
          green300: "rgba(0, 255, 136, 0.3)",
          green400: "rgba(0, 255, 136, 0.4)",
          green500: "rgba(0, 255, 136, 0.5)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      spacing: {
        '8': '8px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
      },
    },
  },
  plugins: [],
};
export default config;
