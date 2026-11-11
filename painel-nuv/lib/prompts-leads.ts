// Texto de instrução das mensagens de prospecção (o mesmo do nuv-leads).
// Compartilhado: o servidor usa com a API e o navegador monta o pedido para colar no Claude, sem custo.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const SISTEMA_LEADS = `Você escreve mensagens de prospecção para a Agência NUV (@nuv.social), de Belo Horizonte, fundada pela Isabela.

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

export function montarPedidoLead(lead: Record<string, any>, canal: string, rascunho = "", pedido = "") {
  const nomeCanal = canal === "instagram" ? "Direct do Instagram" : canal === "email" ? "E-mail" : "WhatsApp";
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
  return [
    `Canal: ${nomeCanal}`,
    `<lead>\n${ficha}\n</lead>`,
    rascunho
      ? `<rascunho>\n${rascunho}\n</rascunho>\nRefine o rascunho acima mantendo a estrutura, deixando mais personalizado e natural.`
      : "Escreva a mensagem do zero.",
    pedido ? `Pedido extra da Isabela: ${pedido}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Versão completa para colar numa conversa do Claude (instruções + pedido). */
export function pedidoLeadParaClaude(lead: Record<string, any>, canal: string, rascunho = "", pedido = "") {
  return `${SISTEMA_LEADS}\n\n${montarPedidoLead(lead, canal, rascunho, pedido)}`;
}
