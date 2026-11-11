import "server-only";
import { z } from "zod";
import { db, hojeBrasil } from "./supabase";

export const CATEGORIAS_ENTRADA = ["Mensalidade", "Área de membros", "Landing Page", "E-book", "Arte", "Vídeo", "Notion", "Projeto avulso", "Consultoria", "Site", "Identidade visual", "Outros"];
export const CATEGORIAS_SAIDA = ["Ferramentas", "Freelancers", "Custo de serviço", "Impostos", "Tráfego / anúncios", "Pró-labore", "Equipamentos", "Cursos", "Outros"];

export type Lancamento = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  cliente_id: string | null;
  forma_pagamento: string | null;
  pago: boolean;
  origem: "manual" | "mensalidade" | "recorrente" | "servico";
  origem_id: string | null;
  competencia: string;
  observacao: string | null;
};

export type ClienteFin = { id: string; nome: string; mensalidade: number; dia_vencimento: number; ativo: boolean };
export type Recorrente = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  categoria: string;
  dia: number;
  cliente_id: string | null;
  ativo: boolean;
};

const MES = /^\d{4}-\d{2}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function mesesAnteriores(mes: string, n: number): string[] {
  const [a, m] = mes.split("-").map(Number);
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    lista.push(d.toISOString().slice(0, 7));
  }
  return lista;
}

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function normalizar<T extends { valor?: unknown; mensalidade?: unknown }>(linha: T): T {
  const r = { ...linha } as Record<string, unknown>;
  if ("valor" in r) r.valor = num(r.valor);
  if ("mensalidade" in r) r.mensalidade = num(r.mensalidade);
  return r as T;
}

/** Cria as mensalidades dos clientes e as contas fixas do mês, sem duplicar. */
export async function gerarMes(mes: string) {
  if (!MES.test(mes)) throw new Error("Mês inválido");
  const sb = db();
  const [{ data: clientes, error: e1 }, { data: recorrentes, error: e2 }] = await Promise.all([
    sb.from("fin_clientes").select("*").eq("ativo", true).gt("mensalidade", 0),
    sb.from("fin_recorrentes").select("*").eq("ativo", true),
  ]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);

  const dia = (d: number) => `${mes}-${String(d).padStart(2, "0")}`;
  const linhas = [
    ...(clientes ?? []).map((c) => ({
      tipo: "entrada",
      descricao: `Mensalidade ${c.nome}`,
      valor: c.mensalidade,
      data: dia(c.dia_vencimento),
      categoria: "Mensalidade",
      cliente_id: c.id,
      origem: "mensalidade",
      origem_id: c.id,
      competencia: mes,
      parcela: 1,
    })),
    ...(recorrentes ?? []).map((r) => ({
      tipo: r.tipo,
      descricao: r.descricao,
      valor: r.valor,
      data: dia(r.dia),
      categoria: r.categoria,
      cliente_id: r.cliente_id,
      origem: "recorrente",
      origem_id: r.id,
      competencia: mes,
      parcela: 1,
    })),
  ];
  if (!linhas.length) return 0;
  const { error, data } = await sb
    .from("fin_lancamentos")
    .upsert(linhas, { onConflict: "origem,origem_id,competencia,parcela", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function carregarMes(mes: string) {
  if (!MES.test(mes)) throw new Error("Mês inválido");
  const sb = db();
  const hoje = hojeBrasil();
  // o mês corrente se monta sozinho; meses passados/futuros só pelo botão
  if (mes === hoje.slice(0, 7)) await gerarMes(mes);

  const historicoMeses = mesesAnteriores(mes, 6);
  const [cli, rec, lan, hist] = await Promise.all([
    sb.from("fin_clientes").select("*").order("nome"),
    sb.from("fin_recorrentes").select("*").order("tipo").order("descricao"),
    sb.from("fin_lancamentos").select("*").eq("competencia", mes).order("data").order("created_at"),
    sb.from("fin_lancamentos").select("tipo, valor, competencia, pago, cliente_id").in("competencia", historicoMeses),
  ]);
  for (const r of [cli, rec, lan, hist]) if (r.error) throw new Error(r.error.message);

  const lancamentos = (lan.data ?? []).map(normalizar) as Lancamento[];
  const clientes = (cli.data ?? []).map(normalizar) as ClienteFin[];

  const soma = (f: (l: Lancamento) => boolean) =>
    lancamentos.filter(f).reduce((t, l) => t + l.valor, 0);
  const entradas = soma((l) => l.tipo === "entrada");
  const saidas = soma((l) => l.tipo === "saida");
  const resumo = {
    entradas,
    saidas,
    lucro: entradas - saidas,
    margem: entradas > 0 ? (entradas - saidas) / entradas : null,
    recebido: soma((l) => l.tipo === "entrada" && l.pago),
    aReceber: soma((l) => l.tipo === "entrada" && !l.pago),
    pago: soma((l) => l.tipo === "saida" && l.pago),
    aPagar: soma((l) => l.tipo === "saida" && !l.pago),
    atrasados: lancamentos.filter((l) => !l.pago && l.data < hoje),
  };

  const historico = historicoMeses.map((m) => {
    const doMes = (hist.data ?? []).filter((l) => l.competencia === m);
    const e = doMes.filter((l) => l.tipo === "entrada").reduce((t, l) => t + num(l.valor), 0);
    const s = doMes.filter((l) => l.tipo === "saida").reduce((t, l) => t + num(l.valor), 0);
    return { mes: m, entradas: e, saidas: s, lucro: e - s };
  });

  const porCliente = clientes
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      receita: lancamentos.filter((l) => l.tipo === "entrada" && l.cliente_id === c.id).reduce((t, l) => t + l.valor, 0),
      custo: lancamentos.filter((l) => l.tipo === "saida" && l.cliente_id === c.id).reduce((t, l) => t + l.valor, 0),
    }))
    .filter((c) => c.receita || c.custo)
    .sort((a, b) => b.receita - a.receita);

  return {
    mes,
    hoje,
    clientes,
    recorrentes: (rec.data ?? []).map(normalizar) as Recorrente[],
    lancamentos,
    resumo,
    historico,
    porCliente,
    categorias: { entrada: CATEGORIAS_ENTRADA, saida: CATEGORIAS_SAIDA },
  };
}

/* ---------- Ações (validadas) ---------- */

const uuid = z.string().uuid();
const valor = z.coerce.number().min(0).max(10_000_000);
const tipo = z.enum(["entrada", "saida"]);

const LancamentoIn = z.object({
  tipo,
  descricao: z.string().trim().min(1).max(200),
  valor,
  data: z.string().regex(DIA),
  categoria: z.string().trim().min(1).max(60),
  cliente_id: uuid.nullable().optional(),
  forma_pagamento: z.string().trim().max(40).nullable().optional(),
  pago: z.boolean().default(false),
  observacao: z.string().trim().max(500).nullable().optional(),
});

const ClienteIn = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(1).max(80),
  mensalidade: valor,
  dia_vencimento: z.coerce.number().int().min(1).max(28),
  ativo: z.boolean().default(true),
});

const RecorrenteIn = z.object({
  id: uuid.optional(),
  tipo,
  descricao: z.string().trim().min(1).max(200),
  valor,
  categoria: z.string().trim().min(1).max(60),
  dia: z.coerce.number().int().min(1).max(28),
  cliente_id: uuid.nullable().optional(),
  ativo: z.boolean().default(true),
});

export const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("criar_lancamento"), dados: LancamentoIn }),
  z.object({ acao: z.literal("editar_lancamento"), id: uuid, dados: LancamentoIn.partial() }),
  z.object({ acao: z.literal("excluir_lancamento"), id: uuid }),
  z.object({ acao: z.literal("salvar_cliente"), dados: ClienteIn }),
  z.object({ acao: z.literal("salvar_recorrente"), dados: RecorrenteIn }),
  z.object({ acao: z.literal("excluir_recorrente"), id: uuid }),
  z.object({ acao: z.literal("gerar_mes"), mes: z.string().regex(MES) }),
]);

export async function executar(acao: z.infer<typeof Acao>) {
  const sb = db();
  const ok = (r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
  };
  switch (acao.acao) {
    case "criar_lancamento":
      return ok(await sb.from("fin_lancamentos").insert({ ...acao.dados, competencia: acao.dados.data.slice(0, 7), origem: "manual" }));
    case "editar_lancamento": {
      const dados: Record<string, unknown> = { ...acao.dados };
      if (acao.dados.data) dados.competencia = acao.dados.data.slice(0, 7);
      return ok(await sb.from("fin_lancamentos").update(dados).eq("id", acao.id));
    }
    case "excluir_lancamento":
      return ok(await sb.from("fin_lancamentos").delete().eq("id", acao.id));
    case "salvar_cliente": {
      const { id, ...dados } = acao.dados;
      return ok(id ? await sb.from("fin_clientes").update(dados).eq("id", id) : await sb.from("fin_clientes").insert(dados));
    }
    case "salvar_recorrente": {
      const { id, ...dados } = acao.dados;
      return ok(id ? await sb.from("fin_recorrentes").update(dados).eq("id", id) : await sb.from("fin_recorrentes").insert(dados));
    }
    case "excluir_recorrente":
      return ok(await sb.from("fin_recorrentes").delete().eq("id", acao.id));
    case "gerar_mes":
      await gerarMes(acao.mes);
      return;
  }
}
