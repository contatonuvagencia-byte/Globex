import { NextResponse } from "next/server";
import { z } from "zod";
import { veCliente } from "@/lib/permissoes";
import { CATEGORIAS, ItemIn, LIMITE_ARQUIVO, espacoUsado, excluirItem, linkDeEnvio, listarPortfolio, salvarItem } from "@/lib/portfolio";
import { exigir, negado } from "@/lib/usuarios";

export async function GET() {
  const eu = await exigir("portfolio", "ver");
  if (negado(eu)) return eu;
  try {
    const [itens, usado] = await Promise.all([listarPortfolio(eu), espacoUsado()]);
    return NextResponse.json({ itens, categorias: CATEGORIAS, usado, limiteArquivo: LIMITE_ARQUIVO });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const id = z.string().uuid();
const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("link_envio"), nome: z.string().min(1).max(200), tamanho: z.number().int().min(1).max(LIMITE_ARQUIVO), pasta: z.string().uuid().nullable().optional() }),
  z.object({ acao: z.literal("criar"), dados: ItemIn }),
  z.object({ acao: z.literal("atualizar"), id, dados: ItemIn }),
  z.object({ acao: z.literal("excluir"), id }),
]);

export async function POST(req: Request) {
  const eu = await exigir("portfolio", "editar");
  if (negado(eu)) return eu;
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) {
    const grande = corpo.error.issues.some((i) => i.path.includes("tamanho"));
    return NextResponse.json({ erro: grande ? "Arquivo maior que 50 MB. Para vídeos grandes, coloque o link do Drive/YouTube." : "Confira os campos." }, { status: 400 });
  }
  const a = corpo.data;
  if ((a.acao === "criar" || a.acao === "atualizar") && a.dados.cliente && !veCliente(eu, a.dados.cliente)) {
    return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  }
  try {
    if (a.acao === "link_envio") return NextResponse.json(await linkDeEnvio(a.nome, a.pasta));
    if (a.acao === "criar") return NextResponse.json({ id: await salvarItem(a.dados) });
    if (a.acao === "atualizar") return NextResponse.json({ id: await salvarItem(a.dados, a.id) });
    await excluirItem(a.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
