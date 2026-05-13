import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#1a1a1a",
      },
    },
  },
  plugins: [],
} satisfies Config;
