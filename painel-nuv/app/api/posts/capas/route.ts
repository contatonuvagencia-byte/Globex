import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarCapas } from "@/lib/arte";
import { veCliente } from "@/lib/permissoes";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 10;

const Corpo = z.object({
  itens: z
    .array(z.object({ cliente: z.string().uuid(), id: z.string().regex(/^[0-9a-f-]{32,36}$/i), titulo: z.string().max(300) }))
    .max(80),
});

// Miniaturas dos posts que não têm imagem no campo de arquivos (Trello ou imagem dentro da página).
export async function POST(req: Request) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const corpo = Corpo.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  try {
    return NextResponse.json({ capas: await buscarCapas(corpo.data.itens, (nome) => veCliente(eu, nome)) });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
