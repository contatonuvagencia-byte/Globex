import { NextResponse } from "next/server";
import { z } from "zod";
import { mapaFotos, salvarFoto } from "@/lib/fotos";
import { db } from "@/lib/supabase";
import { conferirSenha, exigir, gerarHash, limparCacheUsuarios, negado } from "@/lib/usuarios";

export async function GET() {
  const u = await exigir("logado");
  if (negado(u)) return u;
  const fotos = await mapaFotos().catch(() => ({} as Record<string, string>));
  return NextResponse.json({ usuario: { ...u, foto: fotos[u.id] ?? null } });
}

const Senha = z.object({ atual: z.string().min(1).max(200), nova: z.string().min(8, "A senha nova precisa de 8 caracteres ou mais").max(200) });

// trocar a própria senha
export async function POST(req: Request) {
  const u = await exigir("logado");
  if (negado(u)) return u;
  const bruto = await req.json().catch(() => null);
  if (bruto && "foto" in bruto) {
    try {
      await salvarFoto(u.id, bruto.foto === null ? null : String(bruto.foto));
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
    }
  }
  if (u.id === "dona") return NextResponse.json({ erro: "A senha da administração é a APP_PASSWORD, trocada no Netlify." }, { status: 400 });
  const corpo = Senha.safeParse(bruto);
  if (!corpo.success) return NextResponse.json({ erro: corpo.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { data } = await db().from("usuarios").select("senha_hash").eq("id", u.id).single();
  if (!data || !(await conferirSenha(corpo.data.atual, data.senha_hash))) return NextResponse.json({ erro: "Senha atual incorreta" }, { status: 400 });
  await db().from("usuarios").update({ senha_hash: await gerarHash(corpo.data.nova) }).eq("id", u.id);
  limparCacheUsuarios();
  return NextResponse.json({ ok: true });
}
