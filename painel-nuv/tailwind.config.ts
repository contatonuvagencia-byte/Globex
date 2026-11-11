import type { Config } from "tailwindcss";

// Visual inspirado nas referências: fundo creme, menu escuro, cartões pastel e botões em pílula.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#121212", 2: "#5c5a55", 3: "#99968e" },
        creme: { DEFAULT: "#f1ede4", 2: "#e9e4d8" },
        surface: { DEFAULT: "#faf8f3", 2: "#efebe2" },
        nuv: { DEFAULT: "#5b4bd6", soft: "#ebe7fb" },
        lima: "#d8f26a",
        amarelo: "#f5dc5a",
        lilas: "#d9d1f7",
        rosa: "#f4cbe9",
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"] },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
} satisfies Config;
