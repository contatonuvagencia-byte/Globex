// Sessão assinada (funciona no middleware e no servidor).
// O cookie guarda quem é a pessoa e até quando vale, com uma assinatura HMAC.
// Trocar AUTH_SECRET ou APP_PASSWORD derruba todas as sessões.
export const COOKIE = "nuv_sessao";
export const ID_DONA = "dona"; // login de administradora pela APP_PASSWORD
const VALIDADE_DIAS = 30;

export type Sessao = { u: string; e: number };

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function chave() {
  const segredo = `${process.env.AUTH_SECRET ?? ""}::${process.env.APP_PASSWORD ?? ""}`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function assinarSessao(usuarioId: string): Promise<string> {
  const dados: Sessao = { u: usuarioId, e: Math.floor(Date.now() / 1000) + VALIDADE_DIAS * 86400 };
  const corpo = b64url(new TextEncoder().encode(JSON.stringify(dados)));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(), new TextEncoder().encode(corpo)));
  return `${corpo}.${b64url(assinatura)}`;
}

export async function verificarSessao(token: string | undefined | null): Promise<Sessao | null> {
  if (!token || !process.env.AUTH_SECRET || !process.env.APP_PASSWORD) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chave(), deB64url(assinatura), new TextEncoder().encode(corpo));
    if (!ok) return null;
    const dados = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as Sessao;
    if (!dados.u || dados.e < Date.now() / 1000) return null;
    return dados;
  } catch {
    return null;
  }
}

export const opcoesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * VALIDADE_DIAS,
};

export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
