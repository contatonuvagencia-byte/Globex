import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0b0b0b", 2: "#52514e", 3: "#8a8984" },
        surface: { DEFAULT: "#fcfcfb", 2: "#f4f3f0" },
        nuv: { DEFAULT: "#6250d6", soft: "#eeecfb" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
