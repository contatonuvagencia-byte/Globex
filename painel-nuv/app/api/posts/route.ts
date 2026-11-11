import { NextResponse } from "next/server";
import { listarPosts } from "@/lib/notion";
import { exigir, negado } from "@/lib/usuarios";
import { veCliente } from "@/lib/permissoes";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get("inicio") ?? "";
  const fim = searchParams.get("fim") ?? "";
  if (!ISO.test(inicio) || !ISO.test(fim)) {
    return NextResponse.json({ erro: "Use ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD" }, { status: 400 });
  }
  try {
    const r = await listarPosts(inicio, fim);
    const permitidos = new Set(r.calendarios.filter((c) => veCliente(eu, c.nome)).map((c) => c.id));
    return NextResponse.json({
      ...r,
      calendarios: r.calendarios.filter((c) => permitidos.has(c.id)),
      posts: r.posts.filter((p) => permitidos.has(p.cliente)),
      erros: r.erros.filter((e) => veCliente(eu, e.cliente)),
    });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
