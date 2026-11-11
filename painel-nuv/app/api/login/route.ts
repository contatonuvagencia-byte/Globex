import { NextResponse } from "next/server";
import { COOKIE, ID_DONA, assinarSessao, iguais, opcoesCookie } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { conferirSenha } from "@/lib/usuarios";

const espera = () => new Promise((r) => setTimeout(r, 600)); // atrasa tentativas erradas

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const senha = String(corpo.senha ?? "");
  if (!senha || senha.length > 200) return NextResponse.json({ erro: "Informe a senha" }, { status: 400 });

  let id: string | null = null;
  // administração: e-mail em branco (ou ADMIN_EMAIL) + APP_PASSWORD
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (process.env.APP_PASSWORD && iguais(senha, process.env.APP_PASSWORD) && (!email || (adminEmail && email === adminEmail))) {
    id = ID_DONA;
  } else if (email) {
    const { data } = await db().from("usuarios").select("id, senha_hash, ativo").ilike("email", email).maybeSingle();
    if (data?.ativo && (await conferirSenha(senha, data.senha_hash))) {
      id = data.id;
      await db().from("usuarios").update({ ultimo_acesso: new Date().toISOString() }).eq("id", data.id);
    }
  }
  if (!id) {
    await espera();
    return NextResponse.json({ erro: "E-mail ou senha incorretos" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await assinarSessao(id), opcoesCookie);
  return res;
}
