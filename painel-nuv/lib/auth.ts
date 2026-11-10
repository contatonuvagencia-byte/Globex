// Login simples por senha. O cookie guarda um hash da senha + segredo,
// então trocar APP_PASSWORD ou AUTH_SECRET derruba todas as sessões.
export const COOKIE = "nuv_sessao";

export async function tokenEsperado(): Promise<string> {
  const senha = process.env.APP_PASSWORD ?? "";
  const segredo = process.env.AUTH_SECRET ?? "";
  const dados = new TextEncoder().encode(`${senha}::${segredo}`);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
