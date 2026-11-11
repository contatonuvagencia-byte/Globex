import "server-only";
import type { Calendario } from "./clients";
import { db } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

const API = "https://api.trello.com/1";

export function trelloConfigurado() {
  return Boolean(process.env.TRELLO_KEY && process.env.TRELLO_TOKEN);
}

function autorizacao() {
  return `OAuth oauth_consumer_key="${process.env.TRELLO_KEY}", oauth_token="${process.env.TRELLO_TOKEN}"`;
}

async function trello(path: string) {
  if (!trelloConfigurado()) throw new Error("Trello não configurado (TRELLO_KEY e TRELLO_TOKEN).");
  const res = await fetch(`${API}${path}`, { headers: { Authorization: autorizacao() }, cache: "no-store" });
  if (!res.ok) throw new Error(res.status === 401 ? "A chave do Trello foi recusada. Gere o token de novo." : `Trello respondeu ${res.status}`);
  return res.json();
}

export type Quadro = { id: string; nome: string; url: string };
export type Anexo = { id: string; nome: string; largura: number | null; urlOriginal: string; urlMiniatura: string | null; urlMini: string | null };
export type Card = { id: string; nome: string; url: string; atividade: string; lista: string; anexos: Anexo[] };

/* ---------- quadros ---------- */

let cacheQuadros: { em: number; lista: Quadro[] } | null = null;

export async function listarQuadros(): Promise<Quadro[]> {
  if (cacheQuadros && Date.now() - cacheQuadros.em < 10 * 60_000) return cacheQuadros.lista;
  const dados = await trello("/members/me/boards?filter=open&fields=name,url");
  cacheQuadros = { em: Date.now(), lista: dados.map((b: any) => ({ id: b.id, nome: b.name, url: b.url })) };
  return cacheQuadros.lista;
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Quadro escolhido no calendário ou, se não tiver, o primeiro quadro com o nome do cliente. */
export async function quadroDoCalendario(cal: Pick<Calendario, "nome" | "trello_board">): Promise<Quadro | null> {
  const quadros = await listarQuadros();
  if (cal.trello_board) return quadros.find((q) => q.id === cal.trello_board) ?? null;
  const nome = sem(cal.nome);
  return quadros.find((q) => sem(q.nome).includes(nome)) ?? null;
}

/* ---------- cards e anexos ---------- */

const cacheCards = new Map<string, { em: number; cards: Card[] }>();

export async function cardsDoQuadro(boardId: string): Promise<Card[]> {
  const c = cacheCards.get(boardId);
  if (c && Date.now() - c.em < 5 * 60_000) return c.cards;
  const [cards, listas] = await Promise.all([
    trello(
      `/boards/${boardId}/cards?filter=open&fields=name,url,dateLastActivity,idList` +
        `&attachments=true&attachment_fields=id,name,mimeType,url,isUpload,previews`,
    ),
    trello(`/boards/${boardId}/lists?fields=name`),
  ]);
  const nomeLista = new Map(listas.map((l: any) => [l.id, l.name]));
  const resultado: Card[] = cards.map((k: any) => ({
    id: k.id,
    nome: k.name,
    url: k.url,
    atividade: k.dateLastActivity,
    lista: (nomeLista.get(k.idList) as string) ?? "",
    anexos: (k.attachments ?? [])
      .filter((a: any) => a.isUpload && /^image\//.test(a.mimeType ?? ""))
      .map((a: any) => {
        // miniatura de até ~1200px para carregar rápido; a original fica para o "abrir"
        const previas = (a.previews ?? []).filter((p: any) => p.url && p.width);
        const boa = previas.filter((p: any) => p.width <= 1300).sort((x: any, y: any) => y.width - x.width)[0];
        // e uma bem pequena para a miniatura no card do calendário
        const mini = previas.filter((p: any) => p.width >= 120).sort((x: any, y: any) => x.width - y.width)[0];
        return { id: a.id, nome: a.name, largura: boa?.width ?? null, urlOriginal: a.url, urlMiniatura: boa?.url ?? null, urlMini: mini?.url ?? null };
      }),
  }));
  cacheCards.set(boardId, { em: Date.now(), cards: resultado });
  return resultado;
}

/* ---------- achar o card de um post ---------- */

const PALAVRAS_VAZIAS = new Set(["feed", "reels", "reel", "carrossel", "post", "stories", "story", "estatico", "linkedin", "o", "a", "os", "as", "de", "da", "do", "das", "dos", "e", "que", "na", "no", "em", "um", "uma", "pra", "para", "com", "por"]);

function palavras(titulo: string) {
  return new Set(
    sem(titulo)
      .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ") // datas tipo 25/09
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p)),
  );
}

/** Nota de 0 a 1: quanto o nome do card parece com o título do post. */
export function semelhanca(a: string, b: string) {
  const pa = palavras(a);
  const pb = palavras(b);
  if (!pa.size || !pb.size) return 0;
  let comum = 0;
  pa.forEach((p) => pb.has(p) && comum++);
  return comum / Math.min(pa.size, pb.size);
}

export function melhorCard(cards: Card[], titulo: string): Card | null {
  let melhor: Card | null = null;
  let nota = 0;
  for (const c of cards) {
    const n = semelhanca(c.nome, titulo) + (c.anexos.length ? 0.01 : 0); // empate: prefere quem tem arte
    if (n > nota) {
      nota = n;
      melhor = c;
    }
  }
  return nota >= 0.6 ? melhor : null;
}

/* ---------- vínculo manual ---------- */

export async function vinculoManual(postId: string): Promise<{ existe: boolean; cardId: string | null }> {
  const { data } = await db().from("trello_vinculos").select("card_id").eq("post_id", postId).maybeSingle();
  return data ? { existe: true, cardId: data.card_id } : { existe: false, cardId: null };
}

export async function salvarVinculo(postId: string, cardId: string | null | undefined) {
  if (cardId === undefined) {
    await db().from("trello_vinculos").delete().eq("post_id", postId); // volta para a busca automática
    return;
  }
  const r = await db().from("trello_vinculos").upsert({ post_id: postId, card_id: cardId, atualizado_em: new Date().toISOString() });
  if (r.error) throw new Error(r.error.message);
}

/* ---------- baixar a imagem (o Trello exige a chave também para baixar) ---------- */

export async function baixarAnexo(url: string) {
  const u = new URL(url);
  // só endereços de anexo do próprio Trello (evita usar o painel para buscar outros sites)
  if (u.hostname !== "trello.com" || !u.pathname.startsWith("/1/cards/")) throw new Error("Endereço de anexo inválido");
  const res = await fetch(`https://api.trello.com${u.pathname}`, { headers: { Authorization: autorizacao() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Trello respondeu ${res.status}`);
  return res;
}

/* ---------- enviar uma arte para o card ---------- */

export async function anexarNoCard(cardId: string, arquivo: Blob, nome: string) {
  if (!trelloConfigurado()) throw new Error("Trello não configurado (TRELLO_KEY e TRELLO_TOKEN).");
  const form = new FormData();
  form.append("file", arquivo, nome);
  form.append("name", nome);
  const res = await fetch(`${API}/cards/${cardId}/attachments`, { method: "POST", headers: { Authorization: autorizacao() }, body: form, cache: "no-store" });
  if (res.status === 401) throw new Error("O token do Trello só tem permissão de leitura. Gere um novo token com leitura e escrita (veja o README).");
  if (!res.ok) throw new Error(`Trello respondeu ${res.status}`);
  cacheCards.clear(); // a nova arte aparece na hora
}
