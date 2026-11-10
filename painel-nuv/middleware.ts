import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, iguais, tokenEsperado } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /r/... é o link público do relatório para o cliente (protegido pelo token aleatório)
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login") || pathname.startsWith("/r/")) return NextResponse.next();

  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) {
    return new NextResponse("Configure APP_PASSWORD e AUTH_SECRET nas variáveis de ambiente.", { status: 500 });
  }
  const cookie = req.cookies.get(COOKIE)?.value ?? "";
  if (cookie && iguais(cookie, await tokenEsperado())) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
