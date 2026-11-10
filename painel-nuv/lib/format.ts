export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export const brl = (v: number) => brlFmt.format(v);
export const num = (v: number | null | undefined) => (v === null || v === undefined ? "–" : numFmt.format(v));
export const pct = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(casas).replace(".", ",")}%`;

export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function rotuloMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export function somaMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function diaSemanaLongo(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

/** Semanas (segunda a domingo) que cobrem o mês. */
export function gradeDoMes(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number);
  const primeiro = new Date(Date.UTC(a, m - 1, 1));
  const desloc = (primeiro.getUTCDay() + 6) % 7;
  const inicio = new Date(primeiro);
  inicio.setUTCDate(1 - desloc);
  const ultimo = new Date(Date.UTC(a, m, 0));
  const total = Math.ceil((desloc + ultimo.getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(inicio);
    d.setUTCDate(inicio.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
