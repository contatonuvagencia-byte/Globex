import "server-only";
import { z } from "zod";
import { listarDemandas } from "./demandas";
import { listarPosts } from "./notion";
import { pode, veCliente, type UsuarioPublico } from "./permissoes";
import { db, hojeBrasil } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const texto = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

export const ClienteIn = z.object({
  nome: z.string().trim().min(1).max(80),
  segmento: texto(80),
  contato_nome: texto(120),
  contato_whatsapp: texto(40),
  contato_email: texto(160),
  instagram: texto(120),
  site: texto(300),
  servicos: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  briefing: texto(8000),
  observacoes: texto(8000),
  acessos: texto(4000),
  ativo: z.boolean().default(true),
  // parte financeira / contrato (só quem edita o Financeiro)
  mensalidade: z.coerce.number().min(0).max(10_000_000).optional(),
  dia_vencimento: z.coerce.number().int().min(1).max(28).optional(),
  contrato_inicio: z.string().regex(DIA).nullable().optional(),
  contrato_meses: z.coerce.number().int().min(1).max(60).nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
});
export type ClienteDados = z.infer<typeof ClienteIn>;

const CAMPOS_FINANCEIROS = ["mensalidade", "dia_vencimento", "contrato_inicio", "contrato_meses", "contrato_fim"] as const;

function somaMeses(iso: string, n: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo))).toISOString().slice(0, 10);
}
const diasAte = (iso: string, hoje: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);

/** Fim do contrato e situação (ativo, vence em até 30 dias, vencido). */
export function situacaoContrato(c: { contrato_inicio: string | null; contrato_meses: number | null; contrato_fim: string | null }, hoje = hojeBrasil()) {
  const fim = c.contrato_fim ?? (c.contrato_inicio && c.contrato_meses ? somaMeses(c.contrato_inicio, c.contrato_meses) : null);
  if (!fim) return { fim: null, dias: null, situacao: "sem_contrato" as const };
  const dias = diasAte(fim, hoje);
  return { fim, dias, situacao: dias < 0 ? ("vencido" as const) : dias <= 30 ? ("vence_logo" as const) : ("ativo" as const) };
}

/** Tira o que a pessoa não pode ver: valores para quem não vê o Financeiro e acessos para quem não edita fichas. */
function filtrar(c: any, eu: UsuarioPublico) {
  const r = { ...c, mensalidade: c.mensalidade === null ? null : Number(c.mensalidade) };
  if (!pode(eu, "financeiro", "ver")) {
    r.mensalidade = null;
    r.dia_vencimento = null;
  }
  if (!pode(eu, "clientes", "editar")) r.acessos = null;
  return { ...r, contrato: situacaoContrato(c) };
}

export async function listarClientes(eu: UsuarioPublico) {
  const { data, error } = await db().from("fin_clientes").select("*").order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).filter((c) => veCliente(eu, c.nome)).map((c) => filtrar(c, eu));
}

export async function buscarCliente(id: string) {
  const { data, error } = await db().from("fin_clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const mesmo = (a: string | null | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

/** Tudo sobre um cliente num lugar: cada parte só aparece se o perfil da pessoa permitir. */
export async function fichaCliente(id: string, eu: UsuarioPublico) {
  const c = await buscarCliente(id);
  if (!c || !veCliente(eu, c.nome)) return null;
  const hoje = hojeBrasil();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const [a, m] = hoje.split("-").map(Number);
  const fimMes = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const sb = db();

  const [posts, demandas, relatorios, financeiro, servicos, lead] = await Promise.allSettled([
    pode(eu, "calendario", "ver")
      ? listarPosts(inicioMes, fimMes).then((r) => {
          const ids = new Set(r.calendarios.filter((k) => mesmo(k.nome, c.nome)).map((k) => k.id));
          return { lista: r.posts.filter((p) => ids.has(p.cliente)), calendarios: r.calendarios.filter((k) => ids.has(k.id)) };
        })
      : Promise.resolve(null),
    pode(eu, "demandas", "ver")
      ? listarDemandas().then((r) => r.demandas.filter((d) => mesmo(d.cliente, c.nome) && !d.concluida))
      : Promise.resolve(null),
    pode(eu, "metricas", "ver")
      ? sb.from("metricas_relatorios").select("id, rede, periodo_atual, created_at, token_publico").ilike("cliente", c.nome).order("created_at", { ascending: false }).limit(12).then((r) => r.data ?? [])
      : Promise.resolve(null),
    pode(eu, "financeiro", "ver")
      ? sb.from("fin_lancamentos").select("id, tipo, descricao, valor, data, pago, origem").eq("cliente_id", c.id).eq("excluido", false).order("data", { ascending: false }).limit(24).then((r) =>
          (r.data ?? []).map((l) => ({ ...l, valor: Number(l.valor), atrasado: !l.pago && l.data < hoje })),
        )
      : Promise.resolve(null),
    pode(eu, "servicos", "ver")
      ? sb.from("servicos").select("id, tipo, titulo, valor, status, prazo").ilike("cliente", c.nome).order("created_at", { ascending: false }).then((r) => (r.data ?? []).map((s) => ({ ...s, valor: Number(s.valor) })))
      : Promise.resolve(null),
    c.lead_id && pode(eu, "leads", "ver") ? sb.from("leads").select("id, name, created_at").eq("id", c.lead_id).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ]);
  const valor = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

  const fin = valor(financeiro);
  return {
    cliente: filtrar(c, eu),
    posts: valor(posts),
    demandas: valor(demandas),
    relatorios: valor(relatorios),
    financeiro: fin
      ? {
          lancamentos: fin,
          recebidoAno: fin.filter((l) => l.tipo === "entrada" && l.pago && l.data.startsWith(String(a))).reduce((t, l) => t + l.valor, 0),
          emAtraso: fin.filter((l) => l.tipo === "entrada" && l.atrasado).reduce((t, l) => t + l.valor, 0),
        }
      : null,
    servicos: valor(servicos),
    lead: valor(lead),
    podeEditar: pode(eu, "clientes", "editar"),
    podeEditarFinanceiro: pode(eu, "financeiro", "editar"),
    hoje,
  };
}

/** Grava a ficha. Campos de valor/contrato só passam para quem edita o Financeiro. */
export async function salvarCliente(dados: ClienteDados, eu: UsuarioPublico, id?: string) {
  const linha: Record<string, unknown> = { ...dados };
  if (!pode(eu, "financeiro", "editar")) for (const k of CAMPOS_FINANCEIROS) delete linha[k];
  else if ("contrato_inicio" in dados || "contrato_meses" in dados) {
    const inicio = dados.contrato_inicio ?? null;
    const meses = dados.contrato_meses ?? null;
    linha.contrato_fim = inicio && meses ? somaMeses(inicio, meses) : null;
  }
  for (const k of Object.keys(linha)) if (linha[k] === undefined) delete linha[k];
  const r = id
    ? await db().from("fin_clientes").update(linha).eq("id", id).select("id").single()
    : await db().from("fin_clientes").insert({ mensalidade: 0, dia_vencimento: 10, ...linha }).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id as string;
}

/** Renova: o novo contrato começa no fim do atual (ou hoje, se já venceu há muito tempo). */
export async function renovarContrato(id: string, meses: number) {
  const c = await buscarCliente(id);
  if (!c) throw new Error("Cliente não encontrado");
  const { fim } = situacaoContrato(c);
  const hoje = hojeBrasil();
  const inicio = fim && diasAte(fim, hoje) > -60 ? fim : hoje;
  const r = await db().from("fin_clientes").update({ contrato_inicio: inicio, contrato_meses: meses, contrato_fim: somaMeses(inicio, meses) }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
}
