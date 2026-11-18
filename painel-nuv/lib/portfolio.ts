import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { z } from "zod";
import { veCliente, type UsuarioPublico } from "./permissoes";
import { db } from "./supabase";

export const BUCKET = "portfolio";
export const CATEGORIAS = ["Social media", "Identidade visual", "Landing page", "Site", "Área de membros", "E-book", "Vídeo", "Tráfego pago", "Notion", "Outro"];
export const LIMITE_ARQUIVO = 50 * 1024 * 1024; // limite por arquivo do plano grátis do Supabase

// arquivos sempre ficam em itens/<uuid>/<nome>; nada fora disso é aceito
const CAMINHO = /^itens\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;

export const Arquivo = z.object({
  path: z.string().regex(CAMINHO),
  nome: z.string().trim().min(1).max(200),
  tipo: z.string().max(100),
  tamanho: z.number().int().min(0).max(LIMITE_ARQUIVO),
  mini: z.string().regex(CAMINHO).nullable().optional(), // versão pequena da imagem para a grade
});

const texto = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
export const ItemIn = z.object({
  titulo: z.string().trim().min(1).max(160),
  cliente: texto(120),
  categoria: z.string().trim().min(1).max(60),
  descricao: texto(4000),
  link: z.string().trim().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  arquivos: z.array(Arquivo).max(40).default([]),
  destaque: z.boolean().default(false),
  publico: z.boolean().default(true),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
export type ItemDados = z.infer<typeof ItemIn>;

export function urlPublica(path: string) {
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Junta as URLs dos arquivos para a tela. */
function comUrls(item: any) {
  const arquivos = (item.arquivos ?? []).map((a: any) => ({ ...a, url: urlPublica(a.path), urlMini: a.mini ? urlPublica(a.mini) : null }));
  const capa = arquivos.find((a: any) => a.tipo.startsWith("image/")) ?? null;
  return { ...item, arquivos, capa: capa ? capa.urlMini ?? capa.url : null };
}

export async function listarPortfolio(eu: UsuarioPublico) {
  const { data, error } = await db().from("portfolio_itens").select("*").order("destaque", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  // perfil restrito a alguns clientes vê os trabalhos desses clientes e os gerais da agência
  return (data ?? []).filter((i) => !i.cliente || veCliente(eu, i.cliente)).map(comUrls);
}

export async function listarVitrine() {
  const { data, error } = await db().from("portfolio_itens").select("*").eq("publico", true).order("destaque", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(comUrls);
}

/** Link para o navegador enviar o arquivo direto ao Supabase (não passa pela Netlify, então aceita até 50 MB). */
export async function linkDeEnvio(nome: string, pasta?: string | null) {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "arquivo";
  const path = `itens/${pasta && /^[0-9a-f-]{36}$/.test(pasta) ? pasta : randomUUID()}/${Date.now().toString(36)}-${limpo}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, url: data.signedUrl, pasta: path.split("/")[1] };
}

async function apagarArquivos(paths: string[]) {
  if (paths.length) await db().storage.from(BUCKET).remove(paths);
}
const todosOsCaminhos = (arquivos: { path: string; mini?: string | null }[]) => arquivos.flatMap((a) => [a.path, a.mini].filter(Boolean) as string[]);

export async function salvarItem(dados: ItemDados, id?: string) {
  const sb = db();
  const linha = { ...dados, updated_at: new Date().toISOString() };
  if (id) {
    const { data: antigo } = await sb.from("portfolio_itens").select("arquivos").eq("id", id).maybeSingle();
    if (!antigo) throw new Error("Trabalho não encontrado");
    const r = await sb.from("portfolio_itens").update(linha).eq("id", id);
    if (r.error) throw new Error(r.error.message);
    // arquivos tirados do trabalho saem do armazenamento
    const ficam = new Set(todosOsCaminhos(dados.arquivos));
    await apagarArquivos(todosOsCaminhos(antigo.arquivos ?? []).filter((p) => !ficam.has(p))).catch(() => {});
    return id;
  }
  const r = await sb.from("portfolio_itens").insert(linha).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id as string;
}

export async function excluirItem(id: string) {
  const sb = db();
  const { data } = await sb.from("portfolio_itens").select("arquivos").eq("id", id).maybeSingle();
  const r = await sb.from("portfolio_itens").delete().eq("id", id);
  if (r.error) throw new Error(r.error.message);
  await apagarArquivos(todosOsCaminhos(data?.arquivos ?? [])).catch(() => {});
}

/** Quanto do 1 GB grátis já foi usado (aproximado, pelos tamanhos guardados). */
export async function espacoUsado() {
  const { data } = await db().from("portfolio_itens").select("arquivos");
  return (data ?? []).reduce((t, i: any) => t + (i.arquivos ?? []).reduce((s: number, a: any) => s + (a.tamanho ?? 0), 0), 0);
}
