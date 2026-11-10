import { NextResponse } from "next/server";
import { z } from "zod";
import { detalharPost, marcarPostado } from "@/lib/notion";

const ID = /^[0-9a-f-]{32,36}$/i;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const cliente = new URL(req.url).searchParams.get("cliente") ?? "";
  if (!ID.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  try {
    return NextResponse.json(await detalharPost(cliente, params.id));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const Patch = z.object({ cliente: z.string().uuid(), postado: z.boolean() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const corpo = Patch.safeParse(await req.json().catch(() => null));
  if (!ID.test(params.id) || !corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  try {
    return NextResponse.json(await marcarPostado(corpo.data.cliente, params.id, corpo.data.postado));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
