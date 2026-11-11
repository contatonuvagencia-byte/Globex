// Tons pastel derivados da cor de cada cliente (para o fundo dos cartões, com texto escuro por cima).
export function tom(hex: string, mistura = 0.72): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#efebe2";
  const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const m = n.map((c) => Math.round(c + (255 - c) * mistura));
  return `#${m.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function saudacao(agora = new Date()) {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(agora));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
