import "server-only";
import { z } from "zod";
import { TIPOS, centavos, planoRecebimento, type Tipo } from "./servicos-plano";
import { db, hojeBrasil } from "./supabase";

export { TIPOS, planoRecebimento };



const DIA = /^\d{4}-\d{2}-\d{2}$/;
const texto = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

export const ServicoIn = z.object({
  tipo: z.enum(Object.keys(TIPOS) as [Tipo, ...Tipo[]]),
  titulo: texto(200),
  cliente: z.string().trim().min(1).max(160),
  contato: texto(200),
  valor: z.coerce.number().min(0).max(10_000_000),
  custo: z.coerce.number().min(0).max(10_000_000).default(0),
  pagamento: z.enum(["avista", "sinal", "parcelado"]),
  parcelas: z.coerce.number().int().min(1).max(24).default(1),
  forma_pagamento: texto(40),
  data_inicio: z.string().regex(DIA),
  prazo: z.string().regex(DIA).nullable().optional().transform((v) => v ?? null),
  entregue_em: z.string().regex(DIA).nullable().optional().transform((v) => v ?? null),
  status: z.enum(["orcamento", "andamento", "entregue", "cancelado"]),
  observacoes: texto(4000),
  link: texto(500),
});
export type Servico = z.infer<typeof ServicoIn> & { id: string; created_at?: string };

type Lanc = { id: string; tipo: string; valor: number; data: string; pago: boolean; parcela: number; descricao: string };

const PARCELA_CUSTO = 0;

/**
 * Mantém o financeiro igual ao serviço. Parcelas já marcadas como pagas nunca são mexidas;
 * o que falta receber é redistribuído entre as parcelas em aberto.
 */
export async function sincronizarFinanceiro(s: Servico) {
  const sb = db();
  const { data, error } = await sb
    .from("fin_lancamentos")
    .select("id, tipo, valor, data, pago, parcela, descricao")
    .eq("origem", "servico")
    .eq("origem_id", s.id);
  if (error) throw new Error(error.message);
  const existentes = (data ?? []).map((l) => ({ ...l, valor: Number(l.valor) })) as Lanc[];
  const entradas = existentes.filter((l) => l.tipo === "entrada");
  const custoAtual = existentes.find((l) => l.tipo === "saida" && l.parcela === PARCELA_CUSTO);

  const vendido = s.status === "andamento" || s.status === "entregue";
  const nome = `${TIPOS[s.tipo]} · ${s.cliente}${s.titulo ? ` (${s.titulo})` : ""}`;
  const plano = vendido ? planoRecebimento(s) : [];

  // quanto ainda falta receber, dividido entre as parcelas do plano que não estão pagas
  const pagas = new Map(entradas.filter((l) => l.pago).map((l) => [l.parcela, l]));
  const recebido = [...pagas.values()].reduce((t, l) => t + centavos(l.valor), 0);
  const emAberto = plano.filter((p) => !pagas.has(p.parcela));
  const falta = Math.max(0, centavos(s.valor) - recebido);
  const somaPlano = emAberto.reduce((t, p) => t + centavos(p.valor), 0);
  let distribuido = 0;
  const desejadas = emAberto.map((p, i) => {
    const v = i === emAberto.length - 1 ? falta - distribuido : Math.round((falta * centavos(p.valor)) / (somaPlano || 1));
    distribuido += v;
    return { ...p, valor: v / 100 };
  });

  const total = plano.length;
  const ops: PromiseLike<unknown>[] = [];
  for (const p of desejadas) {
    const linha = {
      tipo: "entrada",
      descricao: total > 1 ? `${nome} ${p.parcela}/${total}` : nome,
      valor: p.valor,
      data: p.data,
      competencia: p.data.slice(0, 7),
      categoria: TIPOS[s.tipo],
      forma_pagamento: s.forma_pagamento,
      origem: "servico",
      origem_id: s.id,
      parcela: p.parcela,
    };
    const atual = entradas.find((l) => l.parcela === p.parcela && !l.pago);
    if (p.valor <= 0) {
      if (atual) ops.push(sb.from("fin_lancamentos").delete().eq("id", atual.id));
    } else if (atual) {
      ops.push(sb.from("fin_lancamentos").update(linha).eq("id", atual.id));
    } else {
      ops.push(sb.from("fin_lancamentos").insert({ ...linha, pago: false }));
    }
  }
  // parcelas em aberto que saíram do plano (ex.: mudou de 3x para à vista, ou cancelou)
  const manter = new Set(desejadas.filter((p) => p.valor > 0).map((p) => p.parcela));
  for (const l of entradas) if (!l.pago && !manter.has(l.parcela)) ops.push(sb.from("fin_lancamentos").delete().eq("id", l.id));

  // custo do serviço (freela, ferramenta...) vira uma saída na data de entrega
  const dataCusto = s.entregue_em ?? s.prazo ?? s.data_inicio;
  if (vendido && s.custo > 0) {
    const linha = {
      tipo: "saida",
      descricao: `Custo: ${nome}`,
      valor: s.custo,
      data: dataCusto,
      competencia: dataCusto.slice(0, 7),
      categoria: "Custo de serviço",
      origem: "servico",
      origem_id: s.id,
      parcela: PARCELA_CUSTO,
    };
    if (custoAtual && !custoAtual.pago) ops.push(sb.from("fin_lancamentos").update(linha).eq("id", custoAtual.id));
    else if (!custoAtual) ops.push(sb.from("fin_lancamentos").insert({ ...linha, pago: false }));
  } else if (custoAtual && !custoAtual.pago) {
    ops.push(sb.from("fin_lancamentos").delete().eq("id", custoAtual.id));
  }

  const resultados = await Promise.all(ops);
  const falha = resultados.find((r) => (r as { error?: { message: string } | null })?.error);
  if (falha) throw new Error((falha as { error: { message: string } }).error.message);
}

export async function listarServicos() {
  const sb = db();
  const [srv, lan] = await Promise.all([
    sb.from("servicos").select("*").order("created_at", { ascending: false }),
    sb.from("fin_lancamentos").select("id, tipo, valor, data, pago, parcela, descricao, origem_id").eq("origem", "servico").order("parcela"),
  ]);
  if (srv.error) throw new Error(srv.error.message);
  if (lan.error) throw new Error(lan.error.message);
  const hoje = hojeBrasil();
  const servicos = (srv.data ?? []).map((s) => {
    const meus = (lan.data ?? []).filter((l) => l.origem_id === s.id).map((l) => ({ ...l, valor: Number(l.valor) }));
    const entradas = meus.filter((l) => l.tipo === "entrada");
    return {
      ...s,
      valor: Number(s.valor),
      custo: Number(s.custo),
      parcelasFin: entradas,
      custoFin: meus.find((l) => l.tipo === "saida") ?? null,
      recebido: entradas.filter((l) => l.pago).reduce((t, l) => t + l.valor, 0),
      aReceber: entradas.filter((l) => !l.pago).reduce((t, l) => t + l.valor, 0),
      atrasado: entradas.some((l) => !l.pago && l.data < hoje),
    };
  });
  return { servicos, tipos: TIPOS, hoje };
}

export async function salvarServico(dados: z.infer<typeof ServicoIn>, id?: string) {
  const sb = db();
  const r = id
    ? await sb.from("servicos").update({ ...dados, updated_at: new Date().toISOString() }).eq("id", id).select("*").single()
    : await sb.from("servicos").insert(dados).select("*").single();
  if (r.error) throw new Error(r.error.message);
  const s = { ...r.data, valor: Number(r.data.valor), custo: Number(r.data.custo) } as Servico;
  await sincronizarFinanceiro(s);
  return s.id;
}

/** Exclui o serviço. O que ainda não foi pago sai do financeiro; o que já foi pago fica como histórico. */
export async function excluirServico(id: string) {
  const sb = db();
  await sb.from("fin_lancamentos").delete().eq("origem", "servico").eq("origem_id", id).eq("pago", false);
  await sb.from("fin_lancamentos").update({ origem: "manual", origem_id: null }).eq("origem", "servico").eq("origem_id", id);
  const r = await sb.from("servicos").delete().eq("id", id);
  if (r.error) throw new Error(r.error.message);
}

export async function marcarParcela(lancamentoId: string, pago: boolean) {
  const r = await db().from("fin_lancamentos").update({ pago }).eq("id", lancamentoId).eq("origem", "servico");
  if (r.error) throw new Error(r.error.message);
}
