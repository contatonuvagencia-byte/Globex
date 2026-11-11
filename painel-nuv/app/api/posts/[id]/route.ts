import { NextResponse } from "next/server";
import { z } from "zod";
import { detalharPost, marcarPostado, mudarData } from "@/lib/notion";
import { exigir, negado } from "@/lib/usuarios";
import { calendarioPorId } from "@/lib/calendarios";
import { veCliente } from "@/lib/permissoes";

const ID = /^[0-9a-f-]{32,36}$/i;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const cliente = new URL(req.url).searchParams.get("cliente") ?? "";
  if (!ID.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  const cal = await calendarioPorId(cliente).catch(() => null);
  if (!cal || !veCliente(eu, cal.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  try {
    return NextResponse.json(await detalharPost(cliente, params.id));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const Patch = z.union([
  z.object({ cliente: z.string().uuid(), postado: z.boolean() }),
  z.object({ cliente: z.string().uuid(), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("calendario", "editar");
  if (negado(eu)) return eu;
  const corpo = Patch.safeParse(await req.json().catch(() => null));
  if (!ID.test(params.id) || !corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  const cal = await calendarioPorId(corpo.data.cliente).catch(() => null);
  if (!cal || !veCliente(eu, cal.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
  try {
    const c = corpo.data;
    if ("data" in c) return NextResponse.json(await mudarData(c.cliente, params.id, c.data));
    return NextResponse.json(await marcarPostado(c.cliente, params.id, c.postado));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
