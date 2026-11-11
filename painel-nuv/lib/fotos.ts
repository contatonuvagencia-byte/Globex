import "server-only";
import { db } from "./supabase";

/** Endereço da foto de cada pessoa (com a data no fim para o navegador atualizar quando trocar). */
export async function mapaFotos(): Promise<Record<string, string>> {
  const { data } = await db().from("avatares").select("usuario_id, atualizado_em");
  const m: Record<string, string> = {};
  for (const f of data ?? []) m[f.usuario_id] = `/api/foto/${encodeURIComponent(f.usuario_id)}?v=${Date.parse(f.atualizado_em)}`;
  return m;
}

export async function salvarFoto(usuarioId: string, imagem: string | null) {
  if (imagem === null) {
    const r = await db().from("avatares").delete().eq("usuario_id", usuarioId);
    if (r.error) throw new Error(r.error.message);
    return;
  }
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imagem)) throw new Error("Formato de imagem inválido");
  if (imagem.length > 280_000) throw new Error("Imagem grande demais");
  const r = await db().from("avatares").upsert({ usuario_id: usuarioId, imagem, atualizado_em: new Date().toISOString() });
  if (r.error) throw new Error(r.error.message);
}

export async function lerFoto(usuarioId: string) {
  const { data } = await db().from("avatares").select("imagem").eq("usuario_id", usuarioId).maybeSingle();
  return data?.imagem ?? null;
}

/** Pessoas que podem ser responsáveis por demandas: a administração + a equipe ativa. */
export async function listarPessoas(nomeAdmin: string) {
  const [{ data }, fotos] = await Promise.all([db().from("usuarios").select("id, nome").eq("ativo", true).order("nome"), mapaFotos()]);
  return [
    { id: "dona", nome: nomeAdmin, foto: fotos.dona ?? null },
    ...(data ?? []).map((u) => ({ id: u.id as string, nome: u.nome as string, foto: fotos[u.id] ?? null })),
  ];
}
