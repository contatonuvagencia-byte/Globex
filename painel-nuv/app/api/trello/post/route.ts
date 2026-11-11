import { NextResponse } from "next/server";
import { z } from "zod";
import { calendarioPorId } from "@/lib/calendarios";
import { veCliente } from "@/lib/permissoes";
import { cardsDoQuadro, melhorCard, quadroDoCalendario, salvarVinculo, trelloConfigurado, vinculoManual, type Card } from "@/lib/trello";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 30;

async function contexto(calId: string) {
  const cal = await calendarioPorId(calId).catch(() => null);
  return cal;
}

const imagens = (calId: string, c: Card) =>
  c.anexos.map((a) => ({
    nome: a.nome,
    src: `/api/trello/anexo?cal=${calId}&card=${c.id}&anexo=${a.id}`,
    original: `/api/trello/anexo?cal=${calId}&card=${c.id}&anexo=${a.id}&tamanho=original`,
  }));

// Artes do Trello para um post: card vinculado à mão, ou o de título mais parecido.
export async function GET(req: Request) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const q = new URL(req.url).searchParams;
  const calId = q.get("cliente") ?? "";
  const postId = q.get("id") ?? "";
  const titulo = (q.get("titulo") ?? "").slice(0, 300);
  if (!trelloConfigurado()) return NextResponse.json({ configurado: false });
  const cal = await contexto(calId);
  if (!cal || !veCliente(eu, cal.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  try {
    const quadro = await quadroDoCalendario(cal);
    if (!quadro) return NextResponse.json({ configurado: true, quadro: null });
    const cards = await cardsDoQuadro(quadro.id);
    const manual = await vinculoManual(postId);
    const card = manual.existe ? cards.find((c) => c.id === manual.cardId) ?? null : melhorCard(cards, titulo);
    const opcoes = [...cards].sort((a, b) => b.atividade.localeCompare(a.atividade)).slice(0, 80).map((c) => ({ id: c.id, nome: c.nome, lista: c.lista, artes: c.anexos.length }));
    return NextResponse.json({
      configurado: true,
      quadro: { nome: quadro.nome, url: quadro.url },
      escolhaManual: manual.existe,
      card: card ? { id: card.id, nome: card.nome, url: card.url, lista: card.lista } : null,
      imagens: card ? imagens(cal.id, card) : [],
      opcoes,
    });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 502 });
  }
}

const Vinculo = z.object({
  cliente: z.string().uuid(),
  postId: z.string().regex(/^[0-9a-f-]{32,36}$/i),
  cardId: z.string().regex(/^[0-9a-f]{24}$/).nullable().optional(), // undefined = voltar ao automático; null = "nenhum card"
});

export async function POST(req: Request) {
  const eu = await exigir("calendario", "editar");
  if (negado(eu)) return eu;
  const corpo = Vinculo.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const cal = await contexto(corpo.data.cliente);
  if (!cal || !veCliente(eu, cal.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  await salvarVinculo(corpo.data.postId, corpo.data.cardId);
  return NextResponse.json({ ok: true });
}
