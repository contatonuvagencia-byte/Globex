import "server-only";
import { randomBytes } from "crypto";
import { z } from "zod";
import { salvarCliente } from "./clientes";
import { pode, type UsuarioPublico } from "./permissoes";
import { db, hojeBrasil } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ---------- lead vira cliente ---------- */

export const Conversao = z.object({
  mensalidade: z.coerce.number().min(0).max(10_000_000).optional(),
  dia_vencimento: z.coerce.number().int().min(1).max(28).optional(),
  contrato_meses: z.coerce.number().int().min(1).max(60).nullable().optional(),
  servicos: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

/** Cria a ficha do cliente com os dados do lead, marca o lead como fechado e registra no histórico. */
export async function converterLead(leadId: string, dados: z.infer<typeof Conversao>, eu: UsuarioPublico) {
  const sb = db();
  const { data: ja } = await sb.from("fin_clientes").select("id").eq("lead_id", leadId).maybeSingle();
  if (ja) return { id: ja.id as string, existia: true };
  const { data: lead, error } = await sb.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) throw new Error("Lead não encontrado");
  const id = await salvarCliente(
    {
      nome: lead.name,
      segmento: lead.category ?? null,
      contato_nome: null,
      contato_whatsapp: lead.whatsapp ?? lead.phone ?? null,
      contato_email: lead.email ?? null,
      instagram: lead.instagram ?? null,
      site: lead.website ?? null,
      servicos: dados.servicos,
      briefing: [lead.diagnosis && `Diagnóstico: ${lead.diagnosis}`, lead.opportunity && `Oportunidade: ${lead.opportunity}`].filter(Boolean).join("\n\n") || null,
      observacoes: lead.notes ?? null,
      acessos: null,
      ativo: true,
      mensalidade: dados.mensalidade,
      dia_vencimento: dados.dia_vencimento,
      contrato_inicio: hojeBrasil(),
      contrato_meses: dados.contrato_meses ?? 6,
      lead_id: leadId,
    },
    eu,
  );
  if (lead.status !== "fechado") {
    await sb.from("leads").update({ status: "fechado" }).eq("id", leadId);
    await sb.from("interactions").insert({ lead_id: leadId, type: "status", content: `${lead.status} → fechado`, created_by: "painel" });
  }
  await sb.from("interactions").insert({ lead_id: leadId, type: "nota", content: `Virou cliente no painel (por ${eu.nome}).`, created_by: "painel" });
  return { id, existia: false };
}

/* ---------- propostas ---------- */

export const Item = z.object({
  descricao: z.string().trim().min(1).max(300),
  valor: z.coerce.number().min(0).max(10_000_000),
  recorrente: z.boolean().default(false),
});

export const PropostaIn = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  cliente: z.string().trim().min(1).max(160),
  titulo: z.string().trim().min(1).max(160).default("Proposta comercial"),
  apresentacao: z.string().trim().max(8000).nullable().optional(),
  itens: z.array(Item).max(30).default([]),
  condicoes: z.string().trim().max(4000).nullable().optional(),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type Proposta = {
  id: string;
  lead_id: string | null;
  cliente: string;
  titulo: string;
  apresentacao: string | null;
  itens: z.infer<typeof Item>[];
  condicoes: string | null;
  validade: string | null;
  status: "rascunho" | "enviada" | "vista" | "aceita" | "recusada";
  token_publico: string | null;
  visualizacoes: number;
  visto_em: string | null;
  enviada_em: string | null;
  respondido_em: string | null;
  respondido_por: string | null;
  resposta_obs: string | null;
  created_at: string;
};

export function totais(itens: Proposta["itens"]) {
  const mensal = itens.filter((i) => i.recorrente).reduce((t, i) => t + Number(i.valor), 0);
  const unico = itens.filter((i) => !i.recorrente).reduce((t, i) => t + Number(i.valor), 0);
  return { mensal, unico };
}

export async function listarPropostas(): Promise<Proposta[]> {
  const { data, error } = await db().from("propostas").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Proposta[];
}

export async function salvarProposta(dados: z.infer<typeof PropostaIn>, id?: string) {
  const linha = { ...dados, apresentacao: dados.apresentacao || null, condicoes: dados.condicoes || null, updated_at: new Date().toISOString() };
  if (id) {
    const { data: atual } = await db().from("propostas").select("status").eq("id", id).maybeSingle();
    if (!atual) throw new Error("Proposta não encontrada");
    if (atual.status === "aceita" || atual.status === "recusada") throw new Error("Essa proposta já foi respondida. Duplique para fazer outra versão.");
  }
  const r = id
    ? await db().from("propostas").update(linha).eq("id", id).select("id").single()
    : await db().from("propostas").insert(linha).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id as string;
}

/** Gera o link e marca como enviada. O lead passa para "proposta". */
export async function enviarProposta(id: string) {
  const sb = db();
  const { data: p } = await sb.from("propostas").select("*").eq("id", id).maybeSingle();
  if (!p) throw new Error("Proposta não encontrada");
  if (!(p.itens as unknown[]).length) throw new Error("Coloque pelo menos um item com valor antes de enviar.");
  const mudancas: Record<string, unknown> = { token_publico: p.token_publico ?? randomBytes(18).toString("base64url") };
  if (p.status === "rascunho") Object.assign(mudancas, { status: "enviada", enviada_em: new Date().toISOString() });
  const { error } = await sb.from("propostas").update(mudancas).eq("id", id);
  if (error) throw new Error(error.message);
  if (p.lead_id && p.status === "rascunho") {
    const { data: lead } = await sb.from("leads").select("status").eq("id", p.lead_id).maybeSingle();
    if (lead && ["novo", "contatado", "respondeu", "reuniao"].includes(lead.status)) {
      await sb.from("leads").update({ status: "proposta", last_contact_at: new Date().toISOString() }).eq("id", p.lead_id);
      await sb.from("interactions").insert({ lead_id: p.lead_id, type: "status", content: `${lead.status} → proposta`, created_by: "painel" });
    }
    await sb.from("interactions").insert({ lead_id: p.lead_id, type: "nota", content: `Proposta enviada: ${p.titulo}`, created_by: "painel" });
  }
  return mudancas.token_publico as string;
}

export async function duplicarProposta(id: string) {
  const { data: p } = await db().from("propostas").select("*").eq("id", id).maybeSingle();
  if (!p) throw new Error("Proposta não encontrada");
  return salvarProposta({ lead_id: p.lead_id, cliente: p.cliente, titulo: `${p.titulo} (nova versão)`, apresentacao: p.apresentacao, itens: p.itens, condicoes: p.condicoes, validade: null });
}

export async function excluirProposta(id: string) {
  const { error } = await db().from("propostas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- link público ---------- */

export const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export async function propostaPorToken(token: string): Promise<Proposta | null> {
  if (!TOKEN.test(token)) return null;
  const { data } = await db().from("propostas").select("*").eq("token_publico", token).maybeSingle();
  return (data as Proposta) ?? null;
}

/** O cliente abriu o link (não conta quando é alguém da equipe logado). */
export async function registrarVisita(p: Proposta) {
  const mudancas: Record<string, unknown> = { visualizacoes: p.visualizacoes + 1, visto_em: p.visto_em ?? new Date().toISOString() };
  if (p.status === "enviada") mudancas.status = "vista";
  await db().from("propostas").update(mudancas).eq("id", p.id);
  if (p.status === "enviada" && p.lead_id) {
    await db().from("interactions").insert({ lead_id: p.lead_id, type: "nota", content: `O cliente abriu a proposta “${p.titulo}”.`, created_by: "link" });
  }
}

export async function responderProposta(p: Proposta, aceita: boolean, nome: string, obs: string | null) {
  if (p.status === "aceita" || p.status === "recusada") throw new Error("Essa proposta já foi respondida.");
  if (p.validade && p.validade < hojeBrasil()) throw new Error("Essa proposta venceu. Fale com a agência para receber uma nova.");
  const sb = db();
  const { error } = await sb
    .from("propostas")
    .update({ status: aceita ? "aceita" : "recusada", respondido_em: new Date().toISOString(), respondido_por: nome, resposta_obs: obs })
    .eq("id", p.id)
    .in("status", ["enviada", "vista"]);
  if (error) throw new Error(error.message);
  if (p.lead_id) {
    const { data: lead } = await sb.from("leads").select("status").eq("id", p.lead_id).maybeSingle();
    const novo = aceita ? "fechado" : "perdido";
    if (lead && lead.status !== novo) {
      await sb.from("leads").update({ status: novo, ...(aceita ? {} : { lost_reason: obs ? `Recusou a proposta: ${obs}` : "Recusou a proposta" }) }).eq("id", p.lead_id);
      await sb.from("interactions").insert({ lead_id: p.lead_id, type: "status", content: `${lead.status} → ${novo}`, created_by: "link" });
    }
    await sb.from("interactions").insert({
      lead_id: p.lead_id,
      type: "nota",
      content: `${nome} ${aceita ? "ACEITOU" : "recusou"} a proposta “${p.titulo}”${obs ? `: ${obs}` : "."}`,
      created_by: "link",
    });
  }
}

/* ---------- meta do mês ---------- */

export const MetaIn = z.object({
  faturamento: z.coerce.number().min(0).max(100_000_000).nullable().optional(),
  clientes: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  leads_contatados: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  propostas: z.coerce.number().int().min(0).max(1000).nullable().optional(),
});

const CONTATOS = ["whatsapp", "instagram", "email", "ligacao", "reuniao"];

/** Meta e quanto já foi feito no mês. Valores em R$ só para quem vê o Financeiro. */
export async function progressoMes(mes: string, eu: UsuarioPublico) {
  const sb = db();
  const [a, m] = mes.split("-").map(Number);
  const ini = `${mes}-01`;
  const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const iniTs = `${ini}T03:00:00Z`; // meia-noite em Brasília
  const fimTs = new Date(Date.UTC(a, m, 1, 3)).toISOString();
  const verFin = pode(eu, "financeiro", "ver");

  const [meta, entradas, novos, contatos, enviadas, aceitas] = await Promise.all([
    sb.from("metas").select("*").eq("mes", mes).maybeSingle(),
    verFin ? sb.from("fin_lancamentos").select("valor, pago").eq("tipo", "entrada").eq("excluido", false).gte("data", ini).lte("data", fim) : Promise.resolve({ data: null }),
    sb.from("fin_clientes").select("id, nome, created_at").gte("created_at", iniTs).lt("created_at", fimTs),
    sb.from("interactions").select("lead_id").in("type", CONTATOS).gte("created_at", iniTs).lt("created_at", fimTs),
    sb.from("propostas").select("id").gte("enviada_em", iniTs).lt("enviada_em", fimTs),
    sb.from("propostas").select("id, itens").eq("status", "aceita").gte("respondido_em", iniTs).lt("respondido_em", fimTs),
  ]);
  const lanc = (entradas.data ?? []) as { valor: number; pago: boolean }[];
  return {
    mes,
    meta: meta.data ? { ...meta.data, faturamento: verFin && meta.data.faturamento !== null ? Number(meta.data.faturamento) : null } : null,
    feito: {
      faturamento: verFin ? lanc.reduce((t, l) => t + Number(l.valor), 0) : null,
      recebido: verFin ? lanc.filter((l) => l.pago).reduce((t, l) => t + Number(l.valor), 0) : null,
      clientes: (novos.data ?? []).length,
      novosClientes: (novos.data ?? []).map((c: any) => c.nome),
      leads_contatados: new Set((contatos.data ?? []).map((c: any) => c.lead_id)).size,
      propostas: (enviadas.data ?? []).length,
      aceitas: (aceitas.data ?? []).length,
      novoMRR: verFin ? (aceitas.data ?? []).reduce((t: number, p: any) => t + totais(p.itens).mensal, 0) : null,
    },
  };
}

export async function salvarMeta(mes: string, dados: z.infer<typeof MetaIn>) {
  const { error } = await db().from("metas").upsert({ mes, ...dados, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
