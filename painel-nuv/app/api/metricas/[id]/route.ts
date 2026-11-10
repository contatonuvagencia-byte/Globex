import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RelatorioSchema } from "@/lib/metricas";
import { gerarHtmlCliente, type RelatorioSalvo } from "@/lib/relatorio-cliente";
import { db } from "@/lib/supabase";

async function buscar(id: string) {
  const { data, error } = await db().from("metricas_relatorios").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const rel = await buscar(params.id);
    if (new URL(req.url).searchParams.get("formato") === "html") {
      const nome = `Relatorio_${rel.cliente}_${rel.periodo_atual}`.replace(/[^\w-]+/g, "_");
      return new Response(gerarHtmlCliente(rel as RelatorioSalvo), {
        headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${nome}.html"` },
      });
    }
    return NextResponse.json({ relatorio: rel });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 404 });
  }
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("publicar") }),
  z.object({ acao: z.literal("despublicar") }),
  z.object({
    acao: z.literal("salvar"),
    metricas: RelatorioSchema.shape.metricas,
    analise: RelatorioSchema.shape.analise.extend({ perfil: z.string().nullable().optional() }),
  }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const a = corpo.data;
  const dados =
    a.acao === "publicar"
      ? { token_publico: randomBytes(18).toString("base64url"), publicado_em: new Date().toISOString() }
      : a.acao === "despublicar"
        ? { token_publico: null, publicado_em: null }
        : { metricas: a.metricas, analise: a.analise };
  // publicar de novo mantém o link que já existe
  if (a.acao === "publicar") {
    const atual = await buscar(params.id).catch(() => null);
    if (atual?.token_publico) return NextResponse.json({ token: atual.token_publico });
  }
  const { data, error } = await db().from("metricas_relatorios").update(dados).eq("id", params.id).select("token_publico").single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, token: data.token_publico });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await db().from("metricas_relatorios").delete().eq("id", params.id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
