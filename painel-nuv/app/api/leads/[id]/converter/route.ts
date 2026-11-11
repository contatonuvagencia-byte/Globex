import { NextResponse } from "next/server";
import { z } from "zod";
import { Conversao, converterLead } from "@/lib/comercial";
import { pode } from "@/lib/permissoes";
import { exigir, negado } from "@/lib/usuarios";

// Lead fechou: cria a ficha do cliente com os dados do lead.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const eu = await exigir("leads", "editar");
  if (negado(eu)) return eu;
  if (!pode(eu, "clientes", "editar")) return NextResponse.json({ erro: "Seu perfil não pode criar fichas de clientes." }, { status: 403 });
  const corpo = Conversao.safeParse(await req.json().catch(() => ({})));
  if (!z.string().uuid().safeParse(params.id).success || !corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  try {
    return NextResponse.json(await converterLead(params.id, corpo.data, eu));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
