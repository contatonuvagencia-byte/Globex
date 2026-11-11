import { NextResponse } from "next/server";
import { z } from "zod";
import { ServicoIn, excluirServico, listarServicos, marcarParcela, salvarServico } from "@/lib/servicos";

export async function GET() {
  try {
    return NextResponse.json(await listarServicos());
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const uuid = z.string().uuid();
const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("criar"), dados: ServicoIn }),
  z.object({ acao: z.literal("atualizar"), id: uuid, dados: ServicoIn }),
  z.object({ acao: z.literal("excluir"), id: uuid }),
  z.object({ acao: z.literal("parcela"), lancamentoId: uuid, pago: z.boolean() }),
]);

export async function POST(req: Request) {
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos", detalhes: corpo.error.issues }, { status: 400 });
  try {
    const a = corpo.data;
    if (a.acao === "criar") return NextResponse.json({ id: await salvarServico(a.dados) });
    if (a.acao === "atualizar") return NextResponse.json({ id: await salvarServico(a.dados, a.id) });
    if (a.acao === "excluir") await excluirServico(a.id);
    if (a.acao === "parcela") await marcarParcela(a.lancamentoId, a.pago);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
