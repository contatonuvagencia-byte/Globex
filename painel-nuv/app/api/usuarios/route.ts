import { NextResponse } from "next/server";
import { z } from "zod";
import { AREAS, PERFIS, normalizarPermissoes } from "@/lib/permissoes";
import { mapaFotos } from "@/lib/fotos";
import { db } from "@/lib/supabase";
import { exigir, gerarHash, limparCacheUsuarios, negado } from "@/lib/usuarios";

// Equipe: só a administração mexe aqui.
export async function GET() {
  const u = await exigir("admin");
  if (negado(u)) return u;
  const { data, error } = await db()
    .from("usuarios")
    .select("id, nome, email, papel, permissoes, clientes, ativo, ultimo_acesso, created_at")
    .order("created_at");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  const fotos = await mapaFotos().catch(() => ({} as Record<string, string>));
  return NextResponse.json({ usuarios: (data ?? []).map((p) => ({ ...p, foto: fotos[p.id] ?? null })), perfis: PERFIS, areas: AREAS });
}

const nivel = z.enum(["nenhum", "ver", "editar"]);
const Dados = z.object({
  nome: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  senha: z.string().max(200).optional(),
  papel: z.enum(Object.keys(PERFIS) as [string, ...string[]]),
  permissoes: z.record(z.string(), nivel).default({}),
  clientes: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  ativo: z.boolean().default(true),
});

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("criar"), dados: Dados.extend({ senha: z.string().min(8, "A senha precisa de 8 caracteres ou mais").max(200) }) }),
  z.object({ acao: z.literal("atualizar"), id: z.string().uuid(), dados: Dados }),
  z.object({ acao: z.literal("excluir"), id: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const u = await exigir("admin");
  if (negado(u)) return u;
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: corpo.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const a = corpo.data;
  const sb = db();
  try {
    if (a.acao === "excluir") {
      const r = await sb.from("usuarios").delete().eq("id", a.id);
      if (r.error) throw new Error(r.error.message);
    } else {
      const { senha, ...resto } = a.dados;
      // perfil pronto usa as permissões dele; "personalizado" usa as escolhidas na tela
      const permissoes = resto.papel === "personalizado" ? normalizarPermissoes(resto.permissoes) : PERFIS[resto.papel].permissoes;
      const linha: Record<string, unknown> = { ...resto, permissoes, clientes: resto.papel === "admin" ? [] : resto.clientes };
      if (senha) {
        if (senha.length < 8) throw new Error("A senha precisa de 8 caracteres ou mais");
        linha.senha_hash = await gerarHash(senha);
      }
      const r = a.acao === "criar" ? await sb.from("usuarios").insert(linha) : await sb.from("usuarios").update(linha).eq("id", a.id);
      if (r.error) throw new Error(r.error.code === "23505" ? "Já existe alguém com esse e-mail." : r.error.message);
    }
    limparCacheUsuarios();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
