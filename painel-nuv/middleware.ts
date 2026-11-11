import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verificarSessao } from "./lib/auth";

// Confere se há uma sessão assinada válida. O que cada pessoa pode ver/editar é checado em cada rota da API.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /r/... (relatório) e /p/... (proposta) são links públicos para o cliente, protegidos pelo token aleatório
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login") || pathname.startsWith("/r/") || pathname.startsWith("/p/")) return NextResponse.next();

  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) {
    return new NextResponse("Configure APP_PASSWORD e AUTH_SECRET nas variáveis de ambiente.", { status: 500 });
  }
  if (await verificarSessao(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
