import "server-only";
import { listarCalendarios } from "./calendarios";
import type { Calendario } from "./clients";
import { calendarioOuErro, notion, propArquivos } from "./notion";
import { anexarNoCard, cardsDoQuadro, melhorCard, quadroDoCalendario, trelloConfigurado, type Card } from "./trello";
import { db } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ---------- miniaturas dos cards do calendário ---------- */

export type PedidoCapa = { cliente: string; id: string; titulo: string };

// Os links de arquivo do Notion valem 1 hora; guardamos por 40 minutos.
const cache = new Map<string, { em: number; url: string | null }>();
const VALIDADE = 40 * 60_000;

async function primeiraImagemDaPagina(pageId: string): Promise<string | null> {
  const r = await notion(`/blocks/${pageId}/children?page_size=60`);
  for (const b of r.results ?? []) {
    if (b.type === "image") return b.image?.file?.url ?? b.image?.external?.url ?? null;
    // muita gente coloca a arte dentro de colunas ou de um toggle "Arte"
    if (b.has_children && ["column_list", "column", "toggle", "callout"].includes(b.type)) {
      const sub = await primeiraImagemDaPagina(b.id).catch(() => null);
      if (sub) return sub;
    }
  }
  return null;
}

async function emLotes<T>(itens: T[], tamanho: number, prazo: number, fn: (x: T) => Promise<void>) {
  const fila = [...itens];
  const fim = Date.now() + prazo;
  await Promise.all(
    Array.from({ length: tamanho }, async () => {
      while (fila.length && Date.now() < fim) await fn(fila.shift()!).catch(() => {});
    }),
  );
}

/**
 * Para cada post sem imagem no campo de arquivos: procura a arte no card do Trello
 * e, se não achar, a primeira imagem dentro da página do Notion.
 * Devolve { idDoPost: url } (só os que têm imagem).
 */
export async function buscarCapas(pedidos: PedidoCapa[], podeVer: (nome: string) => boolean) {
  const resposta: Record<string, string> = {};
  const faltam: PedidoCapa[] = [];
  for (const p of pedidos) {
    const c = cache.get(p.id);
    if (c && Date.now() - c.em < VALIDADE) {
      if (c.url) resposta[p.id] = c.url;
    } else faltam.push(p);
  }
  if (!faltam.length) return resposta;

  const cals = new Map((await listarCalendarios(true)).filter((c) => podeVer(c.nome)).map((c) => [c.id, c]));
  const validos = faltam.filter((p) => cals.has(p.cliente));

  // 1) Trello: um pedido por quadro (com cache), vínculos manuais numa consulta só
  if (trelloConfigurado() && validos.length) {
    const { data: vinculos } = await db().from("trello_vinculos").select("post_id, card_id").in("post_id", validos.map((p) => p.id));
    const manual = new Map((vinculos ?? []).map((v) => [v.post_id, v.card_id as string | null]));
    const porCal = new Map<string, PedidoCapa[]>();
    validos.forEach((p) => porCal.set(p.cliente, [...(porCal.get(p.cliente) ?? []), p]));
    await Promise.all(
      [...porCal].map(async ([calId, lista]) => {
        const quadro = await quadroDoCalendario(cals.get(calId)!).catch(() => null);
        if (!quadro) return;
        const cards: Card[] = await cardsDoQuadro(quadro.id).catch(() => []);
        for (const p of lista) {
          const card = manual.has(p.id) ? cards.find((c) => c.id === manual.get(p.id)) : melhorCard(cards, p.titulo);
          const a = card?.anexos[0];
          if (card && a) resposta[p.id] = `/api/trello/anexo?cal=${calId}&card=${card.id}&anexo=${a.id}&tamanho=mini`;
        }
      }),
    );
  }

  // 2) Notion: imagem dentro da página (até ~7 s, 6 de cada vez, para caber no limite da Netlify)
  const semCapa = validos.filter((p) => !resposta[p.id]);
  const vistos = new Set<string>();
  await emLotes(semCapa, 6, 7000, async (p) => {
    const url = await primeiraImagemDaPagina(p.id);
    vistos.add(p.id);
    if (url) resposta[p.id] = url;
  });

  for (const p of validos) if (resposta[p.id] || vistos.has(p.id)) cache.set(p.id, { em: Date.now(), url: resposta[p.id] ?? null });
  return resposta;
}

/* ---------- enviar uma arte pelo painel ---------- */

export const LIMITE_ARTE = 4.5 * 1024 * 1024; // Netlify aceita até ~6 MB por pedido; Notion grátis, 5 MB por arquivo

async function enviarAoNotion(cal: Calendario, pageId: string, arquivo: File) {
  const criado = await notion("/file_uploads", { method: "POST", body: { filename: arquivo.name, content_type: arquivo.type } });
  const form = new FormData();
  form.append("file", arquivo, arquivo.name);
  await notion(`/file_uploads/${criado.id}/send`, { method: "POST", form });

  // Se o calendário tem campo de arquivos vazio, a arte vai para ele (vira a capa do card).
  // Senão, entra como imagem no fim da página do post.
  const campo = cal.campos.arquivos;
  if (campo) {
    const page = await notion(`/pages/${pageId}`);
    if (page.properties?.[campo]?.type === "files" && !propArquivos(page.properties[campo]).length) {
      await notion(`/pages/${pageId}`, {
        method: "PATCH",
        body: { properties: { [campo]: { files: [{ type: "file_upload", file_upload: { id: criado.id }, name: arquivo.name }] } } },
      });
      return "campo";
    }
  }
  await notion(`/blocks/${pageId}/children`, {
    method: "PATCH",
    body: { children: [{ object: "block", type: "image", image: { type: "file_upload", file_upload: { id: criado.id } } }] },
  });
  return "pagina";
}

export async function enviarArte(opts: { calId: string; pageId: string; titulo: string; arquivo: File; notion: boolean; trello: boolean }) {
  const cal = await calendarioOuErro(opts.calId);
  const resultado: { notion?: string; trello?: string; erros: string[] } = { erros: [] };

  const tarefas: Promise<void>[] = [];
  if (opts.notion) {
    tarefas.push(
      enviarAoNotion(cal, opts.pageId, opts.arquivo)
        .then((onde) => void (resultado.notion = onde === "campo" ? "Salva no campo de arquivos do post" : "Adicionada no fim da página do post"))
        .catch((e) => void resultado.erros.push(`Notion: ${/permission|insert/i.test(e.message) ? "a integração precisa da capacidade “Inserir conteúdo”." : e.message}`)),
    );
  }
  if (opts.trello) {
    tarefas.push(
      (async () => {
        const quadro = await quadroDoCalendario(cal);
        if (!quadro) throw new Error("este cliente não tem quadro no Trello.");
        const cards = await cardsDoQuadro(quadro.id);
        const { data: v } = await db().from("trello_vinculos").select("card_id").eq("post_id", opts.pageId).maybeSingle();
        const card = v ? cards.find((c) => c.id === v.card_id) : melhorCard(cards, opts.titulo);
        if (!card) throw new Error("não achei o card deste post. Escolha o card na parte do Trello e envie de novo.");
        await anexarNoCard(card.id, opts.arquivo, opts.arquivo.name);
        resultado.trello = `Anexada no card “${card.nome}”`;
      })().catch((e) => void resultado.erros.push(`Trello: ${e.message}`)),
    );
  }
  await Promise.all(tarefas);
  cache.delete(opts.pageId);
  return resultado;
}
