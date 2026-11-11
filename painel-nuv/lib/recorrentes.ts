import "server-only";
import { criarDemanda } from "./demandas";
import { db } from "./supabase";

export const FREQUENCIAS = ["diaria", "dias_uteis", "semanal", "quinzenal", "mensal"] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];

export type Recorrente = {
  id: string;
  titulo: string;
  cliente: string | null;
  prioridade: string | null;
  duracao: string | null;
  responsavel?: string | null;
  frequencia: Frequencia;
  data_inicio: string;
  ativo: boolean;
};

/** Até quantos dias à frente cada tipo de repetição já aparece no Notion. */
const ANTECEDENCIA: Record<Frequencia, number> = { diaria: 7, dias_uteis: 7, semanal: 14, quinzenal: 28, mensal: 35 };

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const hojeBrasil = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** A regra cai nesse dia? */
export function caiNoDia(r: Pick<Recorrente, "frequencia" | "data_inicio">, dia: string): boolean {
  if (dia < r.data_inicio) return false;
  const delta = diasEntre(r.data_inicio, dia);
  const semana = new Date(`${dia}T12:00:00Z`).getUTCDay();
  switch (r.frequencia) {
    case "diaria":
      return true;
    case "dias_uteis":
      return semana >= 1 && semana <= 5;
    case "semanal":
      return delta % 7 === 0;
    case "quinzenal":
      return delta % 14 === 0;
    case "mensal": {
      // mesmo dia do mês; em meses mais curtos, cai no último dia (ex.: 31 → 30/11)
      const alvo = Number(r.data_inicio.slice(8, 10));
      const [a, m] = dia.split("-").map(Number);
      const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
      return Number(dia.slice(8, 10)) === Math.min(alvo, ultimo);
    }
  }
}

/** Próxima data em que a regra cai, a partir de hoje (para mostrar na lista de regras). */
export function proximaData(r: Recorrente, aPartirDe = hojeBrasil()): string | null {
  let dia = r.data_inicio > aPartirDe ? r.data_inicio : aPartirDe;
  for (let i = 0; i < 400; i++, dia = somaDias(dia, 1)) if (caiNoDia(r, dia)) return dia;
  return null;
}

export async function listarRecorrentes(): Promise<(Recorrente & { proxima: string | null })[]> {
  const { data, error } = await db().from("demandas_recorrentes").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data as Recorrente[]).map((r) => ({ ...r, proxima: r.ativo ? proximaData(r) : null }));
}

export async function idsGerados(): Promise<Set<string>> {
  const { data } = await db().from("demandas_geradas").select("notion_page_id").not("notion_page_id", "is", null);
  return new Set((data ?? []).map((x) => String(x.notion_page_id).replace(/-/g, "")));
}

/**
 * Cria no Notion as próximas repetições que ainda não existem.
 * Nunca cria datas passadas (começa em hoje) e tem limite por rodada para caber no tempo da hospedagem.
 */
export async function gerarRecorrentes(limite = 15): Promise<{ criadas: number; pendentes: boolean }> {
  const sb = db();
  const { data: regras, error } = await sb.from("demandas_recorrentes").select("*").eq("ativo", true);
  if (error) throw new Error(error.message);
  const hoje = hojeBrasil();
  const prazo = Date.now() + 7_000;
  let criadas = 0;

  for (const r of (regras ?? []) as Recorrente[]) {
    const inicio = r.data_inicio > hoje ? r.data_inicio : hoje;
    const fim = somaDias(hoje, ANTECEDENCIA[r.frequencia]);
    const datas: string[] = [];
    for (let d = inicio; d <= fim; d = somaDias(d, 1)) if (caiNoDia(r, d)) datas.push(d);
    if (!datas.length) continue;

    const { data: feitas } = await sb.from("demandas_geradas").select("data").eq("recorrente_id", r.id).in("data", datas);
    const jaFeitas = new Set((feitas ?? []).map((x) => x.data));

    for (const data of datas.filter((d) => !jaFeitas.has(d))) {
      if (criadas >= limite || Date.now() > prazo) return { criadas, pendentes: true };
      // reserva a data antes de criar no Notion: duas abas abertas não duplicam
      const reserva = await sb.from("demandas_geradas").insert({ recorrente_id: r.id, data });
      if (reserva.error) continue;
      try {
        const nova = await criarDemanda({ titulo: r.titulo, cliente: r.cliente, data, prioridade: r.prioridade, duracao: r.duracao, responsavel: r.responsavel ?? null });
        await sb.from("demandas_geradas").update({ notion_page_id: nova.id }).eq("recorrente_id", r.id).eq("data", data);
        criadas++;
      } catch (e) {
        await sb.from("demandas_geradas").delete().eq("recorrente_id", r.id).eq("data", data);
        throw e;
      }
    }
  }
  return { criadas, pendentes: false };
}

export async function salvarRecorrente(dados: Omit<Recorrente, "id" | "ativo"> & { id?: string; ativo?: boolean }) {
  const { id, ...resto } = dados;
  const r = id
    ? await db().from("demandas_recorrentes").update(resto).eq("id", id)
    : await db().from("demandas_recorrentes").insert({ ...resto, ativo: resto.ativo ?? true });
  if (r.error) throw new Error(r.error.message);
}

export async function atualizarRecorrente(id: string, dados: Partial<Omit<Recorrente, "id">>) {
  const r = await db().from("demandas_recorrentes").update(dados).eq("id", id);
  if (r.error) throw new Error(r.error.message);
}

/** Exclui a regra. As demandas já criadas no Notion continuam lá. */
export async function excluirRecorrente(id: string) {
  const r = await db().from("demandas_recorrentes").delete().eq("id", id);
  if (r.error) throw new Error(r.error.message);
}
