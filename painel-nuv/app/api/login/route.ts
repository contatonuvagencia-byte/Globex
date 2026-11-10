import { NextResponse } from "next/server";
import { COOKIE, iguais, tokenEsperado } from "@/lib/auth";

export async function POST(req: Request) {
  const { senha } = await req.json().catch(() => ({ senha: "" }));
  if (!process.env.APP_PASSWORD || !iguais(String(senha ?? ""), process.env.APP_PASSWORD)) {
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenEsperado(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
