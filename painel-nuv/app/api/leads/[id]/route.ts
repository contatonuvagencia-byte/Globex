import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { INTERACOES, LeadIn, atualizarLead, detalharLead, excluirInteracao, gerarMensagem, registrarInteracao } from "@/lib/leads";

export const maxDuration = 60;

const uuid = z.string().uuid();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  try {
    return NextResponse.json(await detalharLead(params.id));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 404 });
  }
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("atualizar"), dados: LeadIn.partial() }),
  z.object({
    acao: z.literal("interacao"),
    tipo: z.enum(INTERACOES),
    conteudo: z.string().max(8000).nullable(),
    followupDias: z.number().int().min(1).max(60).optional(),
  }),
  z.object({ acao: z.literal("excluir_interacao"), interacaoId: uuid }),
  z.object({
    acao: z.literal("gerar_mensagem"),
    canal: z.enum(["whatsapp", "instagram", "email"]),
    rascunho: z.string().max(4000).default(""),
    pedido: z.string().max(500).default(""),
  }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!uuid.safeParse(params.id).success || !corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const a = corpo.data;
  try {
    if (a.acao === "atualizar") await atualizarLead(params.id, a.dados);
    if (a.acao === "interacao") await registrarInteracao(params.id, a.tipo, a.conteudo, a.followupDias);
    if (a.acao === "excluir_interacao") await excluirInteracao(a.interacaoId);
    if (a.acao === "gerar_mensagem") return NextResponse.json({ mensagem: await gerarMensagem(params.id, a.canal, a.rascunho, a.pedido) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ erro: "ANTHROPIC_API_KEY inválida" }, { status: 500 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ erro: "Limite da API atingido, tente em instantes." }, { status: 429 });
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
