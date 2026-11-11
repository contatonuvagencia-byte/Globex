import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { promisify } from "node:util";
import { COOKIE, ID_DONA, verificarSessao } from "./auth";
import { PERFIS, normalizarPermissoes, pode, type Area, type UsuarioPublico } from "./permissoes";
import { db } from "./supabase";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export async function gerarHash(senha: string) {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, guardado: string) {
  const [alg, sal, hash] = guardado.split("$");
  if (alg !== "scrypt" || !sal || !hash) return false;
  const calculado = await scrypt(senha, Buffer.from(sal, "base64"), 64);
  const esperado = Buffer.from(hash, "base64");
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

export function dona(): UsuarioPublico {
  return {
    id: ID_DONA,
    nome: process.env.ADMIN_NOME || "Isabela",
    email: null,
    papel: "admin",
    permissoes: PERFIS.admin.permissoes,
    clientes: [],
    admin: true,
  };
}

type Linha = { id: string; nome: string; email: string; papel: string; permissoes: unknown; clientes: string[]; ativo: boolean };

export function paraPublico(l: Linha): UsuarioPublico {
  const admin = l.papel === "admin";
  return {
    id: l.id,
    nome: l.nome,
    email: l.email,
    papel: l.papel,
    permissoes: admin ? PERFIS.admin.permissoes : normalizarPermissoes(l.permissoes as Record<string, string>),
    clientes: admin ? [] : l.clientes ?? [],
    admin,
  };
}

// cache curto: desativar alguém ou mudar o perfil vale em até 20 segundos
const cache = new Map<string, { em: number; u: UsuarioPublico | null }>();
export function limparCacheUsuarios() {
  cache.clear();
}

export async function usuarioAtual(): Promise<UsuarioPublico | null> {
  const sessao = await verificarSessao(cookies().get(COOKIE)?.value);
  if (!sessao) return null;
  if (sessao.u === ID_DONA) return dona();
  const c = cache.get(sessao.u);
  if (c && Date.now() - c.em < 20_000) return c.u;
  const { data } = await db().from("usuarios").select("id, nome, email, papel, permissoes, clientes, ativo").eq("id", sessao.u).maybeSingle();
  const u = data && data.ativo ? paraPublico(data as Linha) : null;
  cache.set(sessao.u, { em: Date.now(), u });
  return u;
}

/**
 * Use no começo de cada rota: devolve a pessoa logada ou uma resposta 401/403 pronta.
 * nivel "admin" = só administração (Equipe, configuração de calendários).
 */
export async function exigir(area: Area | "admin" | "logado", nivel: "ver" | "editar" = "ver"): Promise<UsuarioPublico | NextResponse> {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Sua sessão acabou. Entre de novo." }, { status: 401 });
  if (area === "logado") return u;
  if (area === "admin") return u.admin ? u : NextResponse.json({ erro: "Só a administração pode fazer isso." }, { status: 403 });
  if (!pode(u, area, nivel)) {
    return NextResponse.json(
      { erro: nivel === "editar" ? "Seu perfil pode ver esta área, mas não editar." : "Seu perfil não tem acesso a esta área." },
      { status: 403 },
    );
  }
  return u;
}

export const negado = (x: unknown): x is NextResponse => x instanceof NextResponse;
