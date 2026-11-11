// Nomes dos serviços e cálculo das parcelas: usado no servidor e na prévia do formulário.

export const TIPOS = {
  area_membros: "Área de membros",
  landing_page: "Landing Page",
  ebook: "E-book",
  arte: "Arte",
  video: "Vídeo",
  notion: "Notion",
} as const;
export type Tipo = keyof typeof TIPOS;

function somaMeses(iso: string, n: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  const dt = new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo)));
  return dt.toISOString().slice(0, 10);
}
function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const centavos = (v: number) => Math.round(v * 100);

/**
 * Plano de recebimento do serviço (sem considerar o que já foi pago).
 * - à vista: tudo na data de início
 * - sinal: metade no início, metade no prazo de entrega
 * - parcelado: N parcelas mensais a partir do início
 * A diferença de centavos fica na última parcela.
 */
export function planoRecebimento(s: { valor: number; pagamento: "avista" | "sinal" | "parcelado"; parcelas: number; data_inicio: string; prazo: string | null }) {
  const total = centavos(s.valor);
  if (total <= 0) return [];
  const datas =
    s.pagamento === "avista"
      ? [s.data_inicio]
      : s.pagamento === "sinal"
        ? [s.data_inicio, s.prazo ?? somaDias(s.data_inicio, 30)]
        : Array.from({ length: s.parcelas }, (_, i) => somaMeses(s.data_inicio, i));
  const base = Math.floor(total / datas.length);
  return datas.map((data, i) => ({
    parcela: i + 1,
    data,
    valor: (i === datas.length - 1 ? total - base * (datas.length - 1) : base) / 100,
  }));
}

