import "server-only";
import { CLIENTES, clientePorSlug, type ClientConfig } from "./clients";
import type { Midia, Post, PostDetalhe, Secao } from "./types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const TZ = "America/Sao_Paulo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type NotionProp = any;
type NotionBlock = any;

async function notion(path: string, init?: { method?: string; body?: unknown }) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN não configurado");
  const res = await fetch(`${NOTION_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion ${res.status} em ${path}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

/* ---------- Conversão de propriedades ---------- */

function richText(arr: any[] | undefined): string {
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

function propArquivos(p: NotionProp): Midia[] {
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

function derivarStatus(cfg: ClientConfig, props: Record<string, NotionProp>) {
  const c = cfg.campos;
  if (c.status) {
    return { status: propTexto(props[c.status]) ?? "Sem status", checks: null };
  }
  if (c.checks) {
    const lista = [
      { chave: c.checks.conteudo, nome: "Legenda" },
      { chave: c.checks.arte, nome: "Arte" },
      { chave: c.checks.aprovacao, nome: "Aprovado" },
      { chave: c.checks.postado, nome: "Postado" },
    ]
      .filter((x) => x.chave)
      .map((x) => ({ nome: x.nome, feito: propCheckbox(props[x.chave!]) }));
    const feito = (n: string) => lista.find((x) => x.nome === n)?.feito;
    let status = "A fazer";
    if (feito("Postado")) status = "Publicado";
    else if (feito("Aprovado")) status = "Aprovado";
    else if (feito("Legenda") && feito("Arte")) status = "Aguardando aprovação";
    else if (feito("Legenda") || feito("Arte")) status = "Em produção";
    else if (c.etapa && propTexto(props[c.etapa])) status = propTexto(props[c.etapa])!;
    return { status, checks: lista };
  }
  return { status: "Sem status", checks: null };
}

function paginaParaPost(cfg: ClientConfig, page: any): Post | null {
  const props = page.properties ?? {};
  const quando = propData(props[cfg.campos.data]);
  if (!quando) return null;
  const { status, checks } = derivarStatus(cfg, props);
  return {
    id: page.id,
    cliente: cfg.slug,
    titulo: propTexto(props[cfg.campos.titulo]) ?? "(sem título)",
    data: quando.data,
    hora: quando.hora,
    formato: cfg.campos.formato ? propTexto(props[cfg.campos.formato]) : null,
    redes: cfg.campos.rede ? propLista(props[cfg.campos.rede]) : [],
    status,
    pilar: cfg.campos.pilar ? propTexto(props[cfg.campos.pilar]) : null,
    notionUrl: page.url,
    checks,
  };
}

/* ---------- Listagem do calendário ---------- */

function somaDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function postsDoCliente(cfg: ClientConfig, inicio: string, fim: string): Promise<Post[]> {
  const posts: Post[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion(`/databases/${cfg.databaseId}/query`, {
      method: "POST",
      body: {
        page_size: 100,
        start_cursor: cursor,
        // margem de 1 dia por causa de posts com horário (fuso UTC x Brasília)
        filter: {
          and: [
            { property: cfg.campos.data, date: { on_or_after: somaDias(inicio, -1) } },
            { property: cfg.campos.data, date: { on_or_before: somaDias(fim, 1) } },
          ],
        },
      },
    });
    for (const page of res.results) {
      const p = paginaParaPost(cfg, page);
      if (p && p.data >= inicio && p.data <= fim) posts.push(p);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return posts;
}

export type ResultadoCalendario = { posts: Post[]; erros: { cliente: string; mensagem: string }[] };

export async function listarPosts(inicio: string, fim: string): Promise<ResultadoCalendario> {
  const resultados = await Promise.allSettled(CLIENTES.map((c) => postsDoCliente(c, inicio, fim)));
  const posts: Post[] = [];
  const erros: ResultadoCalendario["erros"] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") posts.push(...r.value);
    else erros.push({ cliente: CLIENTES[i].nome, mensagem: String(r.reason?.message ?? r.reason) });
  });
  posts.sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? "")));
  return { posts, erros };
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

export async function detalharPost(clienteSlug: string, pageId: string): Promise<PostDetalhe> {
  const cfg = clientePorSlug(clienteSlug);
  if (!cfg) throw new Error("Cliente desconhecido");
  const [page, blocos] = await Promise.all([notion(`/pages/${pageId}`), filhos(pageId)]);
  const post = paginaParaPost(cfg, page);
  if (!post) throw new Error("Post sem data");

  const coleta: Coleta = { secoes: [], midias: propArquivos(page.properties?.[cfg.campos.arquivos ?? ""]) };
  percorrer(blocos, coleta);

  const secoes = coleta.secoes
    .map((s) => ({ titulo: s.titulo.trim(), texto: s.texto.trim() }))
    .filter((s) => s.texto);
  const legendaSec = secoes.find((s) => RE_LEGENDA.test(s.titulo));
  const copySecs = secoes.filter((s) => s !== legendaSec && RE_COPY.test(s.titulo));
  const outras = secoes.filter((s) => s !== legendaSec && !copySecs.includes(s));

  const legendaProp = cfg.campos.legenda ? propTexto(page.properties?.[cfg.campos.legenda]) : null;

  return {
    ...post,
    legenda: legendaSec?.texto ?? legendaProp ?? null,
    copy: copySecs.length ? copySecs.map((s) => (copySecs.length > 1 ? `${s.titulo}\n${s.texto}` : s.texto)).join("\n\n") : null,
    referencias: cfg.campos.referencias ? propTexto(page.properties?.[cfg.campos.referencias]) : null,
    outrasSecoes: outras,
    midias: coleta.midias,
  };
}
