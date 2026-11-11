import { NextResponse } from "next/server";
import { z } from "zod";
import { atualizarDemanda, criarDemanda, listarDemandas } from "@/lib/demandas";
import { FREQUENCIAS, atualizarRecorrente, excluirRecorrente, gerarRecorrentes, listarRecorrentes, salvarRecorrente } from "@/lib/recorrentes";

export async function GET() {
  try {
    const [dados, recorrentes] = await Promise.all([listarDemandas(), listarRecorrentes().catch(() => [])]);
    return NextResponse.json({ ...dados, recorrentes });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

const opcional = z.string().trim().max(200).nullable().optional();
const Dados = z.object({
  titulo: z.string().trim().min(1).max(300).optional(),
  cliente: opcional,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  prioridade: opcional,
  duracao: opcional,
  prazoReal: z.string().trim().max(500).nullable().optional(),
  status: z.string().trim().min(1).max(60).optional(),
  concluida: z.boolean().optional(),
});

const uuid = z.string().uuid();
const Regra = z.object({
  titulo: z.string().trim().min(1).max(300),
  cliente: opcional.transform((v) => v ?? null),
  prioridade: opcional.transform((v) => v ?? null),
  duracao: opcional.transform((v) => v ?? null),
  frequencia: z.enum(FREQUENCIAS),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("gerar") }),
  z.object({ acao: z.literal("criar_recorrente"), dados: Regra }),
  z.object({ acao: z.literal("atualizar_recorrente"), id: uuid, dados: Regra.partial().extend({ ativo: z.boolean().optional() }) }),
  z.object({ acao: z.literal("excluir_recorrente"), id: uuid }),
  z.object({ acao: z.literal("criar"), dados: Dados.extend({ titulo: z.string().trim().min(1).max(300) }) }),
  z.object({ acao: z.literal("atualizar"), id: z.string().regex(/^[0-9a-f-]{32,36}$/i), dados: Dados }),
]);

export async function POST(req: Request) {
  const corpo = Acao.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  try {
    const a = corpo.data;
    if (a.acao === "gerar") return NextResponse.json(await gerarRecorrentes());
    if (a.acao === "criar_recorrente") {
      await salvarRecorrente(a.dados);
      return NextResponse.json(await gerarRecorrentes());
    }
    if (a.acao === "atualizar_recorrente") {
      await atualizarRecorrente(a.id, a.dados);
      return NextResponse.json(await gerarRecorrentes());
    }
    if (a.acao === "excluir_recorrente") {
      await excluirRecorrente(a.id);
      return NextResponse.json({ ok: true });
    }
    const demanda = a.acao === "criar" ? await criarDemanda(a.dados) : await atualizarDemanda(a.id, a.dados);
    return NextResponse.json({ demanda });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
