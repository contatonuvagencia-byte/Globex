import { NextResponse } from "next/server";
import { z } from "zod";
import { duplicarProposta, enviarProposta, excluirProposta, listarPropostas, PropostaIn, salvarProposta } from "@/lib/comercial";
import { exigir, negado } from "@/lib/usuarios";

export async function GET() {
  const eu = await exigir("leads", "ver");
  if (negado(eu)) return eu;
  try {
    return NextResponse.json({ propostas: await listarPropostas() });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const id = z.string().uuid();
const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("criar"), dados: PropostaIn }),
  z.object({ acao: z.literal("atualizar"), id, dados: PropostaIn }),
  z.object({ acao: z.literal("enviar"), id }),
  z.object({ acao: z.literal("duplicar"), id }),
  z.object({ acao: z.literal("excluir"), id }),
]);

export async function POST(req: Request) {
  const eu = await exigir("leads", "editar");
  if (negado(eu)) return eu;
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Confira os campos da proposta." }, { status: 400 });
  const a = corpo.data;
  try {
    if (a.acao === "criar") return NextResponse.json({ id: await salvarProposta(a.dados) });
    if (a.acao === "atualizar") return NextResponse.json({ id: await salvarProposta(a.dados, a.id) });
    if (a.acao === "enviar") return NextResponse.json({ token: await enviarProposta(a.id) });
    if (a.acao === "duplicar") return NextResponse.json({ id: await duplicarProposta(a.id) });
    await excluirProposta(a.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
