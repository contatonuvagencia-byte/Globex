import { NextResponse } from "next/server";
import { listarPosts } from "@/lib/notion";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get("inicio") ?? "";
  const fim = searchParams.get("fim") ?? "";
  if (!ISO.test(inicio) || !ISO.test(fim)) {
    return NextResponse.json({ erro: "Use ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD" }, { status: 400 });
  }
  try {
    return NextResponse.json(await listarPosts(inicio, fim));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
