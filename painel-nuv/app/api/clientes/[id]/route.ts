import { NextResponse } from "next/server";
import { fichaCliente } from "@/lib/clientes";
import { exigir, negado } from "@/lib/usuarios";

export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("clientes", "ver");
  if (negado(eu)) return eu;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ erro: "ID inválido" }, { status: 400 });
  try {
    const f = await fichaCliente(params.id, eu);
    if (!f) return NextResponse.json({ erro: "Cliente não encontrado ou fora do seu perfil." }, { status: 404 });
    return NextResponse.json(f);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
