import { NextResponse } from "next/server";
import { MetaIn, progressoMes, salvarMeta } from "@/lib/comercial";
import { pode } from "@/lib/permissoes";
import { hojeBrasil } from "@/lib/supabase";
import { exigir, negado } from "@/lib/usuarios";

const MES = /^\d{4}-\d{2}$/;

export async function GET(req: Request) {
  const eu = await exigir("leads", "ver");
  if (negado(eu)) return eu;
  const mes = new URL(req.url).searchParams.get("mes") ?? hojeBrasil().slice(0, 7);
  if (!MES.test(mes)) return NextResponse.json({ erro: "Mês inválido" }, { status: 400 });
  try {
    return NextResponse.json(await progressoMes(mes, eu));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const eu = await exigir("leads", "editar");
  if (negado(eu)) return eu;
  const corpo = await req.json().catch(() => null);
  const dados = MetaIn.safeParse(corpo?.meta);
  if (!MES.test(corpo?.mes ?? "") || !dados.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  // a meta em R$ só muda quem edita o Financeiro
  if (!pode(eu, "financeiro", "editar")) delete dados.data.faturamento;
  try {
    await salvarMeta(corpo.mes, dados.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
