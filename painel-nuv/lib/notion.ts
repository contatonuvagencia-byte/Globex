import "server-only";
import { calendarioPorId, listarCalendarios } from "./calendarios";
import type { Calendario } from "./clients";
import type { Midia, Post, PostDetalhe, Secao } from "./types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const TZ = "America/Sao_Paulo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type NotionProp = any;
type NotionBlock = any;

export class NotionErro extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

export async function notion(path: string, init?: { method?: string; body?: unknown; form?: FormData }) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN não configurado");
  const res = await fetch(`${NOTION_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      ...(init?.form ? {} : { "Content-Type": "application/json" }),
    },
    body: init?.form ?? (init?.body ? JSON.stringify(init.body) : undefined),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    let msg = txt.slice(0, 300);
    try {
      msg = JSON.parse(txt).message ?? msg;
    } catch {}
    if (res.status === 404) msg = "Banco não encontrado ou não conectado à integração do Notion (••• > Conexões).";
    if (res.status === 403) msg = "A integração do Notion não tem permissão para isso. Ative “Atualizar conteúdo” nas capacidades da integração.";
    throw new NotionErro(res.status, msg);
  }
  return res.json();
}

/** Aceita um link do Notion ou um ID e devolve o ID de 32 caracteres. */
export function extrairId(texto: string): string | null {
  const limpo = texto.split("?")[0].replace(/-/g, "");
  const m = limpo.match(/[0-9a-f]{32}(?!.*[0-9a-f]{32})/i);
  return m ? m[0].toLowerCase() : null;
}

/* ---------- Conversão de propriedades ---------- */

export function richText(arr: any[] | undefined): string {
  return (arr ?? []).map((t) => t.plain_text ?? "").join("");
}

function propTexto(p: NotionProp): string | null {
  if (!p) return null;
  switch (p.type) {
    case "title":
      return richText(p.title) || null;
    case "rich_text":
      return richText(p.rich_text) || null;
    case "select":
      return p.select?.name ?? null;
    case "status":
      return p.status?.name ?? null;
    case "multi_select":
      return p.multi_select?.map((o: any) => o.name).join(", ") || null;
    default:
      return null;
  }
}

function propLista(p: NotionProp): string[] {
  if (!p) return [];
  if (p.type === "multi_select") return p.multi_select.map((o: any) => o.name);
  const t = propTexto(p);
  return t ? [t] : [];
}

function propCheckbox(p: NotionProp): boolean {
  return p?.type === "checkbox" ? Boolean(p.checkbox) : false;
}

/** Converte a data do Notion para dia e hora no fuso de Brasília. */
function propData(p: NotionProp): { data: string; hora: string | null } | null {
  const start: string | undefined = p?.date?.start;
  if (!start) return null;
  if (start.length === 10) return { data: start, hora: null };
  const d = new Date(start);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return { data: `${get("year")}-${get("month")}-${get("day")}`, hora: `${get("hour")}:${get("minute")}` };
}

export function propArquivos(p: NotionProp): Midia[] {
  if (p?.type !== "files") return [];
  return p.files
    .map((f: any) => {
      const url = f.file?.url ?? f.external?.url;
      if (!url) return null;
      return { tipo: tipoPorNome(f.name ?? url), url, nome: f.name ?? "arquivo" } as Midia;
    })
    .filter(Boolean);
}

function tipoPorNome(nome: string): Midia["tipo"] {
  const n = nome.toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|gif|webp|avif|heic)$/.test(n)) return "imagem";
  if (/\.(mp4|mov|webm|m4v)$/.test(n)) return "video";
  return "arquivo";
}

/* ---------- Status unificado ---------- */

const RE_PUBLICADO = /publicad|postad/i;

function derivarStatus(cal: Calendario, props: Record<string, NotionProp>) {
  const c = cal.campos;
  const lista = c.checks
    ? [
        { chave: c.checks.conteudo, nome: "Legenda" },
        { chave: c.checks.arte, nome: "Arte" },
        { chave: c.checks.aprovacao, nome: "Aprovado" },
        { chave: c.checks.postado, nome: "Postado" },
      ]
        .filter((x) => x.chave)
        .map((x) => ({ nome: x.nome, feito: propCheckbox(props[x.chave!]) }))
    : null;

  let status = c.status ? propTexto(props[c.status]) : null;
  if (lista?.length) {
    const feito = (n: string) => lista.find((x) => x.nome === n)?.feito;
    if (feito("Postado")) status = "Publicado";
    else if (!status || !c.status) {
      if (feito("Aprovado")) status = "Aprovado";
      else if (feito("Legenda") && feito("Arte")) status = "Aguardando aprovação";
      else if (feito("Legenda") || feito("Arte")) status = "Em produção";
      else status = (c.etapa && propTexto(props[c.etapa])) || "A fazer";
    }
  }
  const status2 = status ?? "Sem status";
  return { status: status2, postado: RE_PUBLICADO.test(status2), checks: lista };
}

function paginaParaPost(cal: Calendario, page: any): Post | null {
  const props = page.properties ?? {};
  const quando = propData(props[cal.campos.data]);
  if (!quando) return null;
  const { status, postado, checks } = derivarStatus(cal, props);
  return {
    id: page.id,
    cliente: cal.id,
    titulo: propTexto(props[cal.campos.titulo]) ?? "(sem título)",
    data: quando.data,
    hora: quando.hora,
    formato: cal.campos.formato ? propTexto(props[cal.campos.formato]) : null,
    redes: cal.campos.rede ? propLista(props[cal.campos.rede]) : [],
    status,
    postado,
    pilar: cal.campos.pilar ? propTexto(props[cal.campos.pilar]) : null,
    notionUrl: page.url,
    checks,
    capa: propArquivos(props[cal.campos.arquivos ?? ""]).find((m) => m.tipo === "imagem")?.url ?? null,
  };
}

/* ---------- Listagem do calendário ---------- */

function somaDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function postsDoCalendario(cal: Calendario, inicio: string, fim: string): Promise<Post[]> {
  const posts: Post[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion(`/databases/${cal.database_id}/query`, {
      method: "POST",
      body: {
        page_size: 100,
        start_cursor: cursor,
        // margem de 1 dia por causa de posts com horário (fuso UTC x Brasília)
        filter: {
          and: [
            { property: cal.campos.data, date: { on_or_after: somaDias(inicio, -1) } },
            { property: cal.campos.data, date: { on_or_before: somaDias(fim, 1) } },
          ],
        },
      },
    });
    for (const page of res.results) {
      const p = paginaParaPost(cal, page);
      if (p && p.data >= inicio && p.data <= fim) posts.push(p);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return posts;
}

export type ResultadoCalendario = {
  posts: Post[];
  erros: { cliente: string; mensagem: string }[];
  calendarios: { id: string; nome: string; cor: string }[];
};

export async function listarPosts(inicio: string, fim: string): Promise<ResultadoCalendario> {
  const cals = await listarCalendarios(true);
  const resultados = await Promise.allSettled(cals.map((c) => postsDoCalendario(c, inicio, fim)));
  const posts: Post[] = [];
  const erros: ResultadoCalendario["erros"] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") posts.push(...r.value);
    else erros.push({ cliente: cals[i].nome, mensagem: String(r.reason?.message ?? r.reason) });
  });
  posts.sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? "")));
  return { posts, erros, calendarios: cals.map(({ id, nome, cor }) => ({ id, nome, cor })) };
}

/* ---------- Detalhe do post (legenda, copy, arte) ---------- */

async function filhos(blockId: string, profundidade = 0): Promise<NotionBlock[]> {
  const blocos: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const q = cursor ? `?page_size=100&start_cursor=${cursor}` : "?page_size=100";
    const res = await notion(`/blocks/${blockId}/children${q}`);
    blocos.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  // entra em colunas, toggles e listas para não perder conteúdo aninhado
  if (profundidade < 3) {
    await Promise.all(
      blocos
        .filter((b) => b.has_children && b.type !== "child_page" && b.type !== "child_database")
        .map(async (b) => {
          b._filhos = await filhos(b.id, profundidade + 1);
        }),
    );
  }
  return blocos;
}

const TITULOS = ["heading_1", "heading_2", "heading_3"];

function textoDoBloco(b: NotionBlock): string | null {
  const dado = b[b.type];
  if (!dado) return null;
  const t = richText(dado.rich_text);
  switch (b.type) {
    case "bulleted_list_item":
      return `• ${t}`;
    case "numbered_list_item":
      return `- ${t}`;
    case "to_do":
      return `${dado.checked ? "☑" : "☐"} ${t}`;
    case "quote":
    case "callout":
    case "paragraph":
    case "toggle":
    case "code":
      return t;
    case "divider":
      return null;
    default:
      return TITULOS.includes(b.type) ? t : null;
  }
}

function midiaDoBloco(b: NotionBlock): Midia | null {
  if (!["image", "video", "file", "pdf"].includes(b.type)) return null;
  const d = b[b.type];
  const url = d.type === "external" ? d.external?.url : d.file?.url;
  if (!url) return null;
  const nome = d.name ?? richText(d.caption) ?? b.type;
  const tipo: Midia["tipo"] = b.type === "image" ? "imagem" : b.type === "video" ? "video" : "arquivo";
  return { tipo, url, nome: nome || tipo };
}

type Coleta = { secoes: Secao[]; midias: Midia[] };

function percorrer(blocos: NotionBlock[], coleta: Coleta) {
  for (const b of blocos) {
    const m = midiaDoBloco(b);
    if (m) {
      coleta.midias.push(m);
      continue;
    }
    if (TITULOS.includes(b.type)) {
      coleta.secoes.push({ titulo: textoDoBloco(b) ?? "", texto: "" });
    } else {
      const t = textoDoBloco(b);
      if (t !== null) {
        if (coleta.secoes.length === 0) coleta.secoes.push({ titulo: "", texto: "" });
        const atual = coleta.secoes[coleta.secoes.length - 1];
        atual.texto += (atual.texto ? "\n" : "") + t;
      }
    }
    if (b._filhos) percorrer(b._filhos, coleta);
  }
}

const RE_LEGENDA = /legenda|caption/i;
const RE_COPY = /slide|copy|roteiro|texto da arte|telas|cenas/i;

export async function calendarioOuErro(calId: string) {
  const cal = await calendarioPorId(calId);
  if (!cal) throw new Error("Calendário não encontrado");
  return cal;
}

export async function detalharPost(calId: string, pageId: string): Promise<PostDetalhe> {
  const cal = await calendarioOuErro(calId);
  const [page, blocos] = await Promise.all([notion(`/pages/${pageId}`), filhos(pageId)]);
  const post = paginaParaPost(cal, page);
  if (!post) throw new Error("Post sem data");

  const coleta: Coleta = { secoes: [], midias: propArquivos(page.properties?.[cal.campos.arquivos ?? ""]) };
  percorrer(blocos, coleta);

  const secoes = coleta.secoes
    .map((s) => ({ titulo: s.titulo.trim(), texto: s.texto.trim() }))
    .filter((s) => s.texto);
  const legendaSec = secoes.find((s) => RE_LEGENDA.test(s.titulo));
  const copySecs = secoes.filter((s) => s !== legendaSec && RE_COPY.test(s.titulo));
  const outras = secoes.filter((s) => s !== legendaSec && !copySecs.includes(s));

  const legendaProp = cal.campos.legenda ? propTexto(page.properties?.[cal.campos.legenda]) : null;

  return {
    ...post,
    legenda: legendaSec?.texto ?? legendaProp ?? null,
    copy: copySecs.length ? copySecs.map((s) => (copySecs.length > 1 ? `${s.titulo}\n${s.texto}` : s.texto)).join("\n\n") : null,
    referencias: cal.campos.referencias ? propTexto(page.properties?.[cal.campos.referencias]) : null,
    outrasSecoes: outras,
    midias: coleta.midias,
  };
}

/* ---------- Marcar como postado ---------- */

/**
 * Grava no Notion. Se o banco tem o checkbox de postado, marca ele.
 * Se tem um campo de status com uma opção "Publicado"/"Postado", troca para ela.
 * Desmarcar volta o status para "Aprovado" (ou deixa o checkbox desmarcado).
 */
export async function marcarPostado(calId: string, pageId: string, postado: boolean): Promise<Post> {
  const cal = await calendarioOuErro(calId);
  const props: Record<string, unknown> = {};

  if (cal.campos.checks?.postado) props[cal.campos.checks.postado] = { checkbox: postado };

  if (cal.campos.status) {
    const db = await notion(`/databases/${cal.database_id}`);
    const def = db.properties?.[cal.campos.status];
    const opcoes: string[] = (def?.[def?.type]?.options ?? []).map((o: any) => o.name);
    const alvo = postado ? opcoes.find((o) => RE_PUBLICADO.test(o)) : opcoes.find((o) => /aprovad/i.test(o));
    if (alvo && (def.type === "select" || def.type === "status")) props[cal.campos.status] = { [def.type]: { name: alvo } };
  }

  if (!Object.keys(props).length) {
    throw new Error("Esse calendário não tem checkbox de postado nem status “Publicado” para marcar.");
  }
  const page = await notion(`/pages/${pageId}`, { method: "PATCH", body: { properties: props } });
  const post = paginaParaPost(cal, page);
  if (!post) throw new Error("Post sem data");
  return post;
}

/* ---------- Mudar a data (arrastar no calendário) ---------- */

const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/**
 * Leva o post para outro dia no Notion, mantendo o horário (se houver) e,
 * quando o post tem data de término, mantendo a duração.
 * Se o banco tem o campo "Mês e ano" (template Gestão de Mídias), ele é atualizado junto.
 */
export async function mudarData(calId: string, pageId: string, novaData: string): Promise<Post> {
  const cal = await calendarioOuErro(calId);
  const page = await notion(`/pages/${pageId}`);
  const prop = page.properties?.[cal.campos.data];
  const atual = propData(prop);
  if (!atual) throw new Error("Esse post não tem data no Notion.");
  if (atual.data === novaData) {
    const p = paginaParaPost(cal, page);
    if (!p) throw new Error("Post sem data");
    return p;
  }

  // Brasil não tem horário de verão desde 2019: -03:00 fixo
  const inicio = atual.hora ? `${novaData}T${atual.hora}:00.000-03:00` : novaData;
  let fim: string | null = null;
  const fimOriginal = propData({ date: { start: prop?.date?.end } });
  if (prop?.date?.end && fimOriginal) {
    const d = new Date(`${fimOriginal.data}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + diasEntre(atual.data, novaData));
    const dia = d.toISOString().slice(0, 10);
    fim = fimOriginal.hora ? `${dia}T${fimOriginal.hora}:00.000-03:00` : dia;
  }

  const props: Record<string, unknown> = { [cal.campos.data]: { date: { start: inicio, end: fim } } };
  const campoMes = Object.keys(page.properties ?? {}).find(
    (n) => /^m[eê]s/i.test(n) && page.properties[n].type === "select",
  );
  if (campoMes) props[campoMes] = { select: { name: MESES_PT[Number(novaData.slice(5, 7)) - 1] } };

  let atualizado;
  try {
    atualizado = await notion(`/pages/${pageId}`, { method: "PATCH", body: { properties: props } });
  } catch (e) {
    // se o "Mês e ano" der problema, muda só a data
    if (!campoMes) throw e;
    delete props[campoMes];
    atualizado = await notion(`/pages/${pageId}`, { method: "PATCH", body: { properties: props } });
  }
  const post = paginaParaPost(cal, atualizado);
  if (!post) throw new Error("Post sem data");
  return post;
}
