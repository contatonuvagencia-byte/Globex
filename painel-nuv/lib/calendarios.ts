import "server-only";
import { PALETA, type Calendario, type Campos } from "./clients";
import { extrairId, notion, richText } from "./notion";
import { db } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Banco "CLIENTES" do NUVDash. Clientes com Status = Ativo têm o calendário incluído sozinho. */
const CLIENTES_DB = process.env.NOTION_CLIENTES_DB ?? "28d07ce018a781c98e19d6a5c8a60f1b";
const RE_TITULO_CALENDARIO = /gest[aã]o de m[ií]dias|calend[aá]rio|editorial|posts|conte[uú]dos?/i;

let cache: { em: number; lista: Calendario[] } | null = null;
export function limparCache() {
  cache = null;
}

export async function listarCalendarios(apenasAtivos = false): Promise<Calendario[]> {
  if (!cache || Date.now() - cache.em > 30_000) {
    const { data, error } = await db().from("calendarios").select("*").order("created_at");
    if (error) throw new Error(error.message);
    cache = { em: Date.now(), lista: (data ?? []) as Calendario[] };
  }
  return apenasAtivos ? cache.lista.filter((c) => c.ativo) : cache.lista;
}

export async function calendarioPorId(id: string) {
  return (await listarCalendarios()).find((c) => c.id === id) ?? null;
}

/* ---------- Detecção automática dos campos ---------- */

type Esquema = Record<string, { type: string; name: string }>;

function achar(esquema: Esquema, tipos: string[], re: RegExp): string | undefined {
  const nomes = Object.keys(esquema).filter((n) => tipos.includes(esquema[n].type));
  return nomes.find((n) => re.test(n));
}

/** Lê as colunas do banco e descobre qual é a data, o formato, o status etc. */
export function detectarCampos(esquema: Esquema): Campos | null {
  const titulo = Object.keys(esquema).find((n) => esquema[n].type === "title");
  const datas = Object.keys(esquema).filter((n) => esquema[n].type === "date");
  const data = datas.find((n) => /veicula|publica|post|lan[cç]a/i.test(n)) ?? datas.find((n) => /data|dia/i.test(n)) ?? datas[0];
  if (!titulo || !data) return null;

  const campos: Campos = { titulo, data };
  campos.formato = achar(esquema, ["select", "multi_select"], /formato|tipo de post|tipo/i);
  campos.rede = achar(esquema, ["multi_select", "select"], /rede|plataforma|canal/i);
  campos.status = achar(esquema, ["status", "select"], /^status$/i) ?? achar(esquema, ["status"], /./);
  campos.etapa = achar(esquema, ["select", "status"], /etapa|fase/i);
  campos.pilar = achar(esquema, ["select", "multi_select"], /pilar|editoria|tema/i);
  campos.arquivos = achar(esquema, ["files"], /./);
  campos.legenda = achar(esquema, ["rich_text"], /legenda|caption/i);
  campos.referencias = achar(esquema, ["rich_text"], /refer[eê]ncia/i);

  const checks = {
    conteudo: achar(esquema, ["checkbox"], /legenda|conte[uú]do|copy/i),
    arte: achar(esquema, ["checkbox"], /arte|grava|design/i),
    aprovacao: achar(esquema, ["checkbox"], /aprova/i),
    postado: achar(esquema, ["checkbox"], /postad|publicad/i),
  };
  if (Object.values(checks).some(Boolean)) campos.checks = checks;

  // remove chaves vazias para deixar o JSON limpo
  return JSON.parse(JSON.stringify(campos));
}

async function proximaCor(): Promise<string> {
  const usadas = new Set((await listarCalendarios()).map((c) => c.cor));
  return PALETA.find((c) => !usadas.has(c)) ?? PALETA[(await listarCalendarios()).length % PALETA.length];
}

async function corDoCliente(nome: string) {
  const existente = (await listarCalendarios()).find((c) => c.nome.toLowerCase() === nome.toLowerCase());
  return existente?.cor ?? (await proximaCor());
}

async function lerBanco(databaseId: string) {
  const banco = await notion(`/databases/${databaseId}`);
  return { titulo: richText(banco.title) || "Sem título", esquema: banco.properties as Esquema, parent: banco.parent };
}

/* ---------- Adicionar por link ---------- */

export async function adicionarPorLink(link: string, nome?: string) {
  const id = extrairId(link);
  if (!id) throw new Error("Não achei o ID do banco nesse link. Abra o banco como página inteira e copie o link.");
  if ((await listarCalendarios()).some((c) => c.database_id === id)) throw new Error("Esse calendário já está no painel.");

  const banco = await lerBanco(id);
  const campos = detectarCampos(banco.esquema);
  if (!campos) throw new Error("Esse banco não tem uma coluna de data. O calendário precisa de uma data de publicação.");

  const cliente = nome?.trim() || (await clienteDoBanco(banco.parent))?.nome || banco.titulo.replace(/^.*?[-—]\s*/, "");
  const { error } = await db().from("calendarios").insert({
    nome: cliente,
    database_id: id,
    titulo_notion: banco.titulo,
    cor: await corDoCliente(cliente),
    campos,
    origem: "manual",
  });
  limparCache();
  if (error) throw new Error(error.message);
  return { nome: cliente, titulo: banco.titulo, campos };
}

/* ---------- Descoberta automática ---------- */

type ClienteNotion = { id: string; nome: string; ativo: boolean };
const cacheParentes = new Map<string, ClienteNotion | null>();

/** Sobe pela hierarquia do Notion até achar a página do cliente dentro de CLIENTES. */
async function clienteDoBanco(parent: any, profundidade = 0): Promise<ClienteNotion | null> {
  if (!parent || profundidade > 10) return null;
  const chave = `${parent.type}:${parent[parent.type]}`;
  if (cacheParentes.has(chave)) return cacheParentes.get(chave)!;

  let resultado: ClienteNotion | null = null;
  try {
    if (parent.type === "page_id") {
      const page = await notion(`/pages/${parent.page_id}`);
      const paiDb = page.parent?.database_id?.replace(/-/g, "");
      if (paiDb === CLIENTES_DB) {
        const props = page.properties ?? {};
        const titulo = Object.values(props).find((p: any) => p.type === "title") as any;
        const status = props["Status"];
        const valorStatus = status?.status?.name ?? status?.select?.name ?? "";
        const nome = (richText(titulo?.title) || "Cliente").replace(/^[áa]rea d[oe] cliente\s*[-–—]\s*/i, "").trim();
        resultado = { id: page.id, nome, ativo: /^ativo$/i.test(valorStatus.trim()) };
      } else {
        resultado = await clienteDoBanco(page.parent, profundidade + 1);
      }
    } else if (parent.type === "block_id") {
      const bloco = await notion(`/blocks/${parent.block_id}`);
      resultado = await clienteDoBanco(bloco.parent, profundidade + 1);
    } else if (parent.type === "database_id") {
      const banco = await notion(`/databases/${parent.database_id}`);
      resultado = await clienteDoBanco(banco.parent, profundidade + 1);
    }
  } catch {
    resultado = null; // sem acesso a algum nível: ignora
  }
  cacheParentes.set(chave, resultado);
  return resultado;
}

export type Descoberta = { adicionados: string[]; desligados: string[]; analisados: number; incompleto?: boolean };

/**
 * Procura no Notion bancos de conteúdo (Gestão de Mídias, Calendário, Editorial...) que estejam
 * dentro da página de um cliente ATIVO em CLIENTES e ainda não estejam no painel.
 * - cliente sem calendário no painel: entra ligado
 * - cliente que já tem calendário (ex.: um calendário antigo): entra desligado, para você decidir
 */
export async function descobrir(): Promise<Descoberta> {
  const existentes = await listarCalendarios();
  const conhecidos = new Set(existentes.map((c) => c.database_id));
  const clientesComCalendario = new Set(existentes.map((c) => c.nome.toLowerCase()));
  const resultado: Descoberta = { adicionados: [], desligados: [], analisados: 0 };

  const candidatos: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion("/search", {
      method: "POST",
      body: { filter: { property: "object", value: "database" }, page_size: 100, start_cursor: cursor },
    });
    candidatos.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor && candidatos.length < 1000);

  // o banco padrão do template (Gestão de Mídias) e o mais recente entram ligados primeiro
  const peso = (b: any) => (/gest[aã]o de m[ií]dias/i.test(richText(b.title)) ? 1 : 0);
  candidatos.sort((a, b) => peso(b) - peso(a) || String(b.last_edited_time).localeCompare(String(a.last_edited_time)));

  // filtros sem rede primeiro; depois sobe a hierarquia do Notion em paralelo, com limite de tempo
  // (hospedagem gratuita corta requisições longas; o que faltar é visto na próxima rodada)
  const fila = candidatos
    .map((banco) => ({ banco, id: banco.id.replace(/-/g, ""), titulo: richText(banco.title) }))
    .filter((c) => !conhecidos.has(c.id) && c.id !== CLIENTES_DB && RE_TITULO_CALENDARIO.test(c.titulo))
    .map((c) => ({ ...c, campos: detectarCampos(c.banco.properties) }))
    .filter((c) => c.campos);

  const prazo = Date.now() + 7_000;
  const achados: { id: string; titulo: string; campos: Campos; cliente: ClienteNotion }[] = [];
  for (let i = 0; i < fila.length && Date.now() < prazo; i += 5) {
    const lote = fila.slice(i, i + 5);
    const clientes = await Promise.all(lote.map((c) => clienteDoBanco(c.banco.parent)));
    resultado.analisados += lote.length;
    lote.forEach((c, j) => {
      const cliente = clientes[j];
      // páginas de modelo dentro de CLIENTES (ex.: "TEMPLATE ÁREA DO CLIENTE") não são clientes
      if (cliente?.ativo && !/template|modelo/i.test(cliente.nome)) achados.push({ id: c.id, titulo: c.titulo, campos: c.campos!, cliente });
    });
  }
  resultado.incompleto = resultado.analisados < fila.length;

  for (const { id, titulo, campos, cliente } of achados) {
    const chave = cliente.nome.toLowerCase();
    const jaTem = clientesComCalendario.has(chave);
    const { error } = await db().from("calendarios").insert({
      nome: cliente.nome,
      database_id: id,
      titulo_notion: titulo,
      cor: await corDoCliente(cliente.nome),
      campos,
      ativo: !jaTem,
      origem: "auto",
    });
    limparCache();
    if (error) continue;
    conhecidos.add(id);
    clientesComCalendario.add(chave);
    (jaTem ? resultado.desligados : resultado.adicionados).push(`${cliente.nome} · ${titulo}`);
  }
  return resultado;
}

export async function atualizarCalendario(id: string, dados: Partial<Pick<Calendario, "nome" | "cor" | "ativo" | "trello_board">>) {
  const { error } = await db().from("calendarios").update(dados).eq("id", id);
  limparCache();
  if (error) throw new Error(error.message);
}

