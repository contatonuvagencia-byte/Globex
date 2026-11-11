import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { SISTEMA_LEADS, montarPedidoLead } from "./prompts-leads";
import { db } from "./supabase";

export const NICHOS = ["saude", "b2b", "institucional", "outro"] as const;
export const STATUS = ["novo", "contatado", "respondeu", "reuniao", "proposta", "fechado", "perdido"] as const;
export const SITE = ["desconhecido", "sem_site", "fraco", "bom"] as const;
export const IG = ["desconhecido", "inexistente", "parado", "fraco", "ativo"] as const;
export const PORTE = ["desconhecido", "pequeno", "medio", "grande"] as const;
export const INTERACOES = ["whatsapp", "instagram", "email", "ligacao", "reuniao", "nota", "status"] as const;

const texto = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v === "" ? null : v));

export const LeadIn = z.object({
  name: z.string().trim().min(1).max(160),
  niche: z.enum(NICHOS).optional(),
  category: texto(160),
  city: texto(80),
  neighborhood: texto(80),
  address: texto(200),
  phone: texto(40),
  whatsapp: texto(40),
  email: texto(120),
  website: texto(200),
  site_status: z.enum(SITE).optional(),
  instagram: texto(120),
  ig_status: z.enum(IG).optional(),
  ig_followers: z.coerce.number().int().min(0).nullable().optional(),
  google_rating: z.coerce.number().min(0).max(5).nullable().optional(),
  google_reviews: z.coerce.number().int().min(0).nullable().optional(),
  maps_url: texto(300),
  size: z.enum(PORTE).optional(),
  units: z.coerce.number().int().min(0).nullable().optional(),
  diagnosis: texto(2000),
  opportunity: texto(2000),
  message: texto(4000),
  status: z.enum(STATUS).optional(),
  next_followup_at: z.string().datetime({ offset: true }).nullable().optional(),
  lost_reason: texto(300),
  notes: texto(4000),
  source: texto(120),
});

export async function listarLeads() {
  const { data, error } = await db()
    .from("leads")
    .select("id, name, niche, category, city, neighborhood, status, score, next_followup_at, last_contact_at, site_status, ig_status, instagram, whatsapp, phone, updated_at")
    .order("score", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function detalharLead(id: string) {
  const sb = db();
  const [lead, inter, tpl] = await Promise.all([
    sb.from("leads").select("*").eq("id", id).single(),
    sb.from("interactions").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    sb.from("templates").select("*").order("channel").order("name"),
  ]);
  if (lead.error) throw new Error(lead.error.message);
  return { lead: lead.data, interacoes: inter.data ?? [], modelos: tpl.data ?? [] };
}

export async function criarLead(dados: z.infer<typeof LeadIn>) {
  const { data, error } = await db().from("leads").insert({ ...dados, source: dados.source ?? "painel", created_by: "painel" }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "Já existe um lead com esse nome nessa cidade." : error.message);
  return data.id as string;
}

export async function atualizarLead(id: string, dados: Partial<z.infer<typeof LeadIn>>) {
  const sb = db();
  if (dados.status) {
    const { data: atual } = await sb.from("leads").select("status").eq("id", id).single();
    if (atual && atual.status !== dados.status) {
      await sb.from("interactions").insert({ lead_id: id, type: "status", content: `${atual.status} → ${dados.status}`, created_by: "painel" });
    }
  }
  const { error } = await sb.from("leads").update(dados).eq("id", id);
  if (error) throw new Error(error.message);
}

const UM_DIA = 24 * 60 * 60 * 1000;

/** Registra um contato. Mensagem enviada a um lead novo passa ele para "contatado" e agenda o follow-up. */
export async function registrarInteracao(id: string, tipo: (typeof INTERACOES)[number], conteudo: string | null, followupDias?: number) {
  const sb = db();
  const { error } = await sb.from("interactions").insert({ lead_id: id, type: tipo, content: conteudo, created_by: "painel" });
  if (error) throw new Error(error.message);
  if (tipo === "nota" || tipo === "status") return;

  const { data: lead } = await sb.from("leads").select("status").eq("id", id).single();
  const mudancas: Record<string, unknown> = { last_contact_at: new Date().toISOString() };
  if (followupDias) mudancas.next_followup_at = new Date(Date.now() + followupDias * UM_DIA).toISOString();
  if (lead?.status === "novo") {
    mudancas.status = "contatado";
    await sb.from("interactions").insert({ lead_id: id, type: "status", content: "novo → contatado", created_by: "painel" });
  }
  await sb.from("leads").update(mudancas).eq("id", id);
}

export async function excluirInteracao(id: string) {
  const { error } = await db().from("interactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- Geração de mensagem com IA (mesmo texto de instrução usado no nuv-leads) ---------- */



export async function gerarMensagem(id: string, canal: string, rascunho: string, pedido: string) {
  const { data: lead, error } = await db().from("leads").select("*").eq("id", id).single();
  if (error || !lead) throw new Error("Lead não encontrado");

  const mensagemUsuario = montarPedidoLead(lead, canal, rascunho, pedido);

  const client = new Anthropic();
  const resposta = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SISTEMA_LEADS,
    messages: [{ role: "user", content: mensagemUsuario }],
  });
  if (resposta.stop_reason === "refusal") throw new Error("A IA não conseguiu gerar esta mensagem.");
  return resposta.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
