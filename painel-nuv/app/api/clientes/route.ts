import { NextResponse } from "next/server";
import { z } from "zod";
import { ClienteIn, buscarCliente, listarClientes, renovarContrato, salvarCliente } from "@/lib/clientes";
import { pode, veCliente } from "@/lib/permissoes";
import { exigir, negado } from "@/lib/usuarios";

export async function GET() {
  const eu = await exigir("clientes", "ver");
  if (negado(eu)) return eu;
  try {
    return NextResponse.json({ clientes: await listarClientes(eu), podeEditar: pode(eu, "clientes", "editar") });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("criar"), dados: ClienteIn }),
  z.object({ acao: z.literal("atualizar"), id: z.string().uuid(), dados: ClienteIn.partial() }),
  z.object({ acao: z.literal("renovar"), id: z.string().uuid(), meses: z.number().int().min(1).max(60) }),
]);

export async function POST(req: Request) {
  const eu = await exigir("clientes", "editar");
  if (negado(eu)) return eu;
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: corpo.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const a = corpo.data;
  try {
    if (a.acao !== "criar") {
      const atual = await buscarCliente(a.id);
      if (!atual || !veCliente(eu, atual.nome)) return NextResponse.json({ erro: "Seu perfil não tem acesso a este cliente." }, { status: 403 });
    }
    if (a.acao === "renovar") {
      if (!pode(eu, "financeiro", "editar")) return NextResponse.json({ erro: "Renovar contrato pede acesso de edição ao Financeiro." }, { status: 403 });
      await renovarContrato(a.id, a.meses);
      return NextResponse.json({ ok: true });
    }
    const id = await salvarCliente(a.dados as never, eu, a.acao === "atualizar" ? a.id : undefined);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
