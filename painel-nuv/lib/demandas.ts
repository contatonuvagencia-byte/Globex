import "server-only";
import { listarCalendarios } from "./calendarios";
import { notion, richText } from "./notion";
import { db } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Banco "Minha Semana Produtiva - NUV" no NUVDash. */
const DEMANDAS_DB = process.env.NOTION_DEMANDAS_DB ?? "1d207ce018a78071a1c0f17e172c1c76";
const TZ = "America/Sao_Paulo";

export type Demanda = {
  id: string;
  titulo: string;
  cliente: string | null;
  data: string | null; // AAAA-MM-DD (Brasília)
  dataFim: string | null;
  prioridade: string | null;
  duracao: string | null;
  prazoReal: string | null;
  status: string;
  concluida: boolean;
  url: string;
  /** veio de uma demanda que se repete */
  recorrente?: boolean;
};

type Esquema = {
  titulo: string;
  cliente?: string;
  data?: string;
  status?: string;
  statusTipo?: "status" | "select";
  prioridade?: string;
  duracao?: string;
  prazo?: string;
  opcoes: { clientes: string[]; prioridades: string[]; duracoes: string[]; status: string[] };
  concluido: string;
  inicial: string;
};

let cacheEsquema: { em: number; e: Esquema } | null = null;

/** Lê as colunas do banco uma vez (5 min de cache) e descobre qual é qual pelo tipo e pelo nome. */
async function esquema(): Promise<Esquema> {
  if (cacheEsquema && Date.now() - cacheEsquema.em < 300_000) return cacheEsquema.e;
  const db = await notion(`/databases/${DEMANDAS_DB}`);
  const props = db.properties as Record<string, any>;
  const nomes = Object.keys(props);
  const achar = (tipos: string[], re: RegExp) => nomes.find((n) => tipos.includes(props[n].type) && re.test(n));
  const opcoesDe = (n?: string) => (n ? (props[n][props[n].type]?.options ?? []).map((o: any) => o.name as string) : []);

  const status = achar(["status"], /./) ?? achar(["select"], /status|situa/i);
  const statusOpcoes = opcoesDe(status);
  const e: Esquema = {
    titulo: nomes.find((n) => props[n].type === "title")!,
    cliente: achar(["select"], /cliente/i),
    data: achar(["date"], /data|date|dia|prazo/i) ?? nomes.find((n) => props[n].type === "date"),
    status,
    statusTipo: status ? (props[status].type as "status" | "select") : undefined,
    prioridade: achar(["select"], /priorid/i),
    duracao: achar(["select"], /dura/i),
    prazo: achar(["rich_text"], /prazo/i),
    opcoes: {
      clientes: opcoesDe(achar(["select"], /cliente/i)),
      prioridades: opcoesDe(achar(["select"], /priorid/i)),
      duracoes: opcoesDe(achar(["select"], /dura/i)),
      status: statusOpcoes,
    },
    concluido: statusOpcoes.find((o: string) => /conclu|feito|done|finaliz/i.test(o)) ?? "Concluído",
    inicial: statusOpcoes.find((o: string) => /não inici|a fazer|to do|pendente/i.test(o)) ?? statusOpcoes[0] ?? "Não iniciada",
  };
  cacheEsquema = { em: Date.now(), e };
  return e;
}

function diaBrasil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (iso.length === 10) return iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

function hojeBrasil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function paginaParaDemanda(e: Esquema, page: any): Demanda {
  const p = page.properties ?? {};
  const sel = (n?: string) => (n ? p[n]?.[p[n]?.type]?.name ?? null : null);
  const status = sel(e.status) ?? e.inicial;
  return {
    id: page.id,
    titulo: richText(p[e.titulo]?.title) || "(sem título)",
    cliente: sel(e.cliente),
    data: diaBrasil(e.data ? p[e.data]?.date?.start : null),
    dataFim: diaBrasil(e.data ? p[e.data]?.date?.end : null),
    prioridade: sel(e.prioridade),
    duracao: sel(e.duracao),
    prazoReal: e.prazo ? richText(p[e.prazo]?.rich_text) || null : null,
    status,
    concluida: status === e.concluido,
    url: page.url,
  };
}

/** Demandas em aberto + as concluídas nos últimos 14 dias (para ver o que já saiu). */
export async function listarDemandas() {
  const e = await esquema();
  const desde = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const filtro = e.status
    ? {
        or: [
          { property: e.status, [e.statusTipo!]: { does_not_equal: e.concluido } },
          { timestamp: "last_edited_time", last_edited_time: { on_or_after: desde } },
        ],
      }
    : undefined;

  const demandas: Demanda[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion(`/databases/${DEMANDAS_DB}/query`, {
      method: "POST",
      body: { page_size: 100, start_cursor: cursor, filter: filtro },
    });
    demandas.push(...res.results.map((pg: any) => paginaParaDemanda(e, pg)));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor && demandas.length < 1000);

  // marca as que foram criadas por uma regra de repetição
  const geradas = await db()
    .from("demandas_geradas")
    .select("notion_page_id")
    .not("notion_page_id", "is", null)
    .then((r) => new Set((r.data ?? []).map((x) => String(x.notion_page_id).replace(/-/g, ""))), () => new Set<string>());
  for (const d of demandas) d.recorrente = geradas.has(d.id.replace(/-/g, ""));

  // cores iguais às do calendário quando o cliente tem o mesmo nome
  const cals = await listarCalendarios().catch(() => []);
  const cores: Record<string, string> = {};
  for (const c of cals) cores[c.nome.toLowerCase()] = c.cor;

  const prio: Record<string, number> = { alta: 0, média: 1, media: 1, baixa: 2 };
  demandas.sort(
    (a, b) =>
      Number(a.concluida) - Number(b.concluida) ||
      (a.data ?? "9999").localeCompare(b.data ?? "9999") ||
      (prio[(a.prioridade ?? "").toLowerCase()] ?? 3) - (prio[(b.prioridade ?? "").toLowerCase()] ?? 3),
  );

  return { demandas, opcoes: e.opcoes, concluido: e.concluido, inicial: e.inicial, cores, hoje: hojeBrasil(), notionUrl: `https://www.notion.so/${DEMANDAS_DB}` };
}

export type DadosDemanda = Partial<{
  titulo: string;
  cliente: string | null;
  data: string | null;
  prioridade: string | null;
  duracao: string | null;
  prazoReal: string | null;
  status: string;
  concluida: boolean;
}>;

function propriedades(e: Esquema, d: DadosDemanda) {
  const props: Record<string, unknown> = {};
  const sel = (v: string | null) => (v ? { select: { name: v } } : { select: null });
  if (d.titulo !== undefined) props[e.titulo] = { title: [{ text: { content: d.titulo } }] };
  if (d.cliente !== undefined && e.cliente) props[e.cliente] = sel(d.cliente);
  if (d.data !== undefined && e.data) props[e.data] = { date: d.data ? { start: d.data } : null };
  if (d.prioridade !== undefined && e.prioridade) props[e.prioridade] = sel(d.prioridade);
  if (d.duracao !== undefined && e.duracao) props[e.duracao] = sel(d.duracao);
  if (d.prazoReal !== undefined && e.prazo) props[e.prazo] = { rich_text: d.prazoReal ? [{ text: { content: d.prazoReal } }] : [] };
  const status = d.concluida !== undefined ? (d.concluida ? e.concluido : e.inicial) : d.status;
  if (status && e.status) props[e.status] = { [e.statusTipo!]: { name: status } };
  return props;
}

export async function criarDemanda(d: DadosDemanda & { titulo: string }) {
  const e = await esquema();
  const page = await notion("/pages", {
    method: "POST",
    body: { parent: { database_id: DEMANDAS_DB }, properties: propriedades(e, { status: e.inicial, ...d }) },
  });
  return paginaParaDemanda(e, page);
}

export async function atualizarDemanda(id: string, d: DadosDemanda) {
  const e = await esquema();
  const page = await notion(`/pages/${id}`, { method: "PATCH", body: { properties: propriedades(e, d) } });
  return paginaParaDemanda(e, page);
}
