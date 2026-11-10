import { NextResponse } from "next/server";
import { Acao, carregarMes, executar } from "@/lib/financeiro";

export async function GET(req: Request) {
  const mes = new URL(req.url).searchParams.get("mes") ?? "";
  try {
    return NextResponse.json(await carregarMes(mes));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const acao = Acao.safeParse(corpo);
  if (!acao.success) {
    return NextResponse.json({ erro: "Dados inválidos", detalhes: acao.error.issues }, { status: 400 });
  }
  try {
    await executar(acao.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
