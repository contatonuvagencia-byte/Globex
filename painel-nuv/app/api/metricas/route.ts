import { NextResponse } from "next/server";
import { z } from "zod";
import { RelatorioSchema } from "@/lib/metricas";
import { db } from "@/lib/supabase";

const Salvar = z.object({
  cliente: z.string().trim().min(1).max(80),
  rede: z.string().trim().min(1).max(40),
  periodo_atual: z.string().trim().min(1).max(60),
  periodo_anterior: z.string().trim().max(60).nullable(),
  arquivos: z.array(z.string().max(200)).max(50).default([]),
  relatorio: RelatorioSchema,
});

export async function GET(req: Request) {
  const cliente = new URL(req.url).searchParams.get("cliente");
  try {
    let q = db()
      .from("metricas_relatorios")
      .select("id, cliente, rede, periodo_atual, periodo_anterior, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (cliente) q = q.eq("cliente", cliente);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ relatorios: data });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const corpo = Salvar.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos", detalhes: corpo.error.issues }, { status: 400 });
  const { relatorio, ...resto } = corpo.data;
  try {
    const { data, error } = await db()
      .from("metricas_relatorios")
      .insert({
        ...resto,
        metricas: relatorio.metricas,
        posts: relatorio.posts,
        analise: { ...relatorio.analise, perfil: relatorio.perfil },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data.id });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
