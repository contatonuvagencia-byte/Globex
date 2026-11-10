// Edge Function: gera/refina mensagem de prospecção no tom da Agência NUV.
// Requer o secret ANTHROPIC_API_KEY (Supabase > Edge Functions > Secrets).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Você escreve mensagens de prospecção para a Agência NUV (@nuv.social), de Belo Horizonte, fundada pela Isabela.

Sobre a NUV:
- Serviços: gestão de redes sociais (carro-chefe), landing pages, estratégia digital, identidade visual.
- Mais de 4 anos de mercado, mais de 40 clientes atendidos, posts com mais de 1 milhão de visualizações.
- Clientes atuais de referência: SINAIT (sindicato, MG), Globex Cargo (despacho aduaneiro B2B).
- Slogan: "Hold the vision. Trust the process."

Tom de voz: jovem, confiante, direto, próximo, minimalista. Sem clichês de agência, sem jargão de marketing,
sem excesso de emoji ou exclamação. Fala com o dono/decisor, não com profissional de marketing.
Honesto: nunca prometa resultado que não dá para garantir, nunca invente dados sobre o lead.

Regras da mensagem:
- Português do Brasil.
- Cite um ponto concreto do diagnóstico do lead (sem soar como crítica agressiva).
- Conecte esse ponto a uma consequência real para o negócio (cliente/paciente/contrato perdido).
- Termine com um convite leve e específico (ex.: mandar 3 ideias, 15 min de conversa).
- WhatsApp: até 90 palavras. Direct do Instagram: até 55 palavras. E-mail: até 150 palavras, com assunto.
- Responda SOMENTE com a mensagem final. Para e-mail, primeira linha "Assunto: ..." e depois o corpo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY não configurada no Supabase." }, 500);

  // Garante que quem chama faz parte da equipe (RLS de team_members).
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: team } = await supabase.from("team_members").select("email").limit(1);
  if (!team || team.length === 0) return json({ error: "Acesso negado." }, 403);

  let payload: { leadId?: string; channel?: string; draft?: string; instruction?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const { leadId, channel = "whatsapp", draft = "", instruction = "" } = payload;
  if (!leadId) return json({ error: "leadId obrigatório" }, 400);

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) return json({ error: "Lead não encontrado" }, 404);

  const canal = channel === "instagram" ? "Direct do Instagram" : channel === "email" ? "E-mail" : "WhatsApp";
  const ficha = [
    `Empresa: ${lead.name}`,
    `Nicho: ${lead.niche} · Categoria: ${lead.category ?? "-"}`,
    `Cidade/bairro: ${lead.city ?? "-"} / ${lead.neighborhood ?? "-"}`,
    `Site: ${lead.website ?? "não tem"} (status: ${lead.site_status})`,
    `Instagram: ${lead.instagram ?? "não encontrado"} (status: ${lead.ig_status}${lead.ig_followers ? `, ${lead.ig_followers} seguidores` : ""})`,
    `Google: nota ${lead.google_rating ?? "-"}, ${lead.google_reviews ?? "-"} avaliações`,
    `Porte: ${lead.size}${lead.units ? `, ${lead.units} unidades` : ""}`,
    `Diagnóstico: ${lead.diagnosis ?? "-"}`,
    `Oportunidade para a NUV: ${lead.opportunity ?? "-"}`,
    `Observações: ${lead.notes ?? "-"}`,
  ].join("\n");

  const userMsg = [
    `Canal: ${canal}`,
    `<lead>\n${ficha}\n</lead>`,
    draft ? `<rascunho>\n${draft}\n</rascunho>\nRefine o rascunho acima mantendo a estrutura, deixando mais personalizado e natural.` : "Escreva a mensagem do zero.",
    instruction ? `Pedido extra da Isabela: ${instruction}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    } as any);

    if (response.stop_reason === "refusal") return json({ error: "A IA não conseguiu gerar esta mensagem." }, 422);
    const text = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    return json({ message: text });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status ?? 500 : 500;
    return json({ error: `Erro na IA: ${(e as Error).message}` }, status);
  }
});
