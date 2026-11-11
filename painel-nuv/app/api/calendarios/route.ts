import { NextResponse } from "next/server";
import { z } from "zod";
import { adicionarPorLink, atualizarCalendario, descobrir, listarCalendarios } from "@/lib/calendarios";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 60;

export async function GET() {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  try {
    return NextResponse.json({ calendarios: await listarCalendarios() });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("adicionar"), link: z.string().min(10).max(500), nome: z.string().max(80).optional() }),
  z.object({ acao: z.literal("descobrir") }),
  z.object({
    acao: z.literal("atualizar"),
    id: z.string().uuid(),
    dados: z.object({
      nome: z.string().trim().min(1).max(80).optional(),
      cor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
      ativo: z.boolean().optional(),
      trello_board: z.string().regex(/^[0-9a-f]{24}$/).nullable().optional(),
    }),
  }),
]);

export async function POST(req: Request) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  try {
    const a = corpo.data;
    if (a.acao !== "descobrir" && !eu.admin) return NextResponse.json({ erro: "Só a administração muda os calendários." }, { status: 403 });
    if (a.acao === "adicionar") return NextResponse.json(await adicionarPorLink(a.link, a.nome));
    if (a.acao === "descobrir") return NextResponse.json(await descobrir());
    await atualizarCalendario(a.id, a.dados);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
