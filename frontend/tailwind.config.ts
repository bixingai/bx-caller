import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        graphite: "#242832",
        mist: "#eef2f5",
        cyan: "#12b8d7",
        mint: "#2fd19b",
        coral: "#ff6b4a",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(17, 24, 39, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
