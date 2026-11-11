import type { Config } from "tailwindcss";

// Cores da NUV: azul, #f5f5f5 e preto. Menu escuro, cartões em tons de azul e cinza, botões em pílula.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#121212", 2: "#5c5a55", 3: "#99968e" },
        creme: { DEFAULT: "#f5f5f5", 2: "#ebebeb" },
        azul: { DEFAULT: "#1f3fd1", escuro: "#0b1f7a", medio: "#7d95ff", claro: "#dfe6ff" },
        surface: { DEFAULT: "#fafafa", 2: "#ececec" },
        nuv: { DEFAULT: "#1f3fd1", soft: "#e8edff" },
        lima: "#dfe6ff",
        amarelo: "#c7d3ff",
        lilas: "#dfe6ff",
        rosa: "#e6e6e6",
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"] },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
} satisfies Config;
