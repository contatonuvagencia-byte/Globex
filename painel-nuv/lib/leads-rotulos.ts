// Rótulos em português para os valores guardados no banco de leads (usado no navegador).

export const ROT_STATUS: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  respondeu: "Respondeu",
  reuniao: "Reunião",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};
export const ORDEM_STATUS = Object.keys(ROT_STATUS);

export const ROT_NICHO: Record<string, string> = { saude: "Saúde", b2b: "B2B", institucional: "Institucional", outro: "Outro" };
export const ROT_SITE: Record<string, string> = { desconhecido: "A verificar", sem_site: "Sem site", fraco: "Fraco", bom: "Bom" };
export const ROT_IG: Record<string, string> = { desconhecido: "A verificar", inexistente: "Não tem", parado: "Parado", fraco: "Fraco", ativo: "Ativo" };
export const ROT_PORTE: Record<string, string> = { desconhecido: "A verificar", pequeno: "Pequeno", medio: "Médio", grande: "Grande" };
export const ROT_INTERACAO: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Direct",
  email: "E-mail",
  ligacao: "Ligação",
  reuniao: "Reunião",
  nota: "Nota",
  status: "Status",
};

export type LeadResumo = {
  id: string;
  name: string;
  niche: string;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  status: string;
  score: number;
  next_followup_at: string | null;
  last_contact_at: string | null;
  site_status: string;
  ig_status: string;
  instagram: string | null;
  whatsapp: string | null;
  phone: string | null;
};

/** Preenche {empresa}, {diagnostico}, {diagnostico_curto}, {categoria} e {oportunidade}. */
export function preencherModelo(texto: string, lead: Record<string, unknown>) {
  const diag = String(lead.diagnosis ?? "").trim();
  const primeira = diag.split(/(?<=[.!?])\s/)[0] ?? "";
  const curto = primeira ? primeira.charAt(0).toLowerCase() + primeira.slice(1).replace(/[.!?]$/, "") : "";
  return texto
    .replaceAll("{empresa}", String(lead.name ?? ""))
    .replaceAll("{diagnostico_curto}", curto)
    .replaceAll("{diagnostico}", diag)
    .replaceAll("{categoria}", String(lead.category ?? "").toLowerCase())
    .replaceAll("{oportunidade}", String(lead.opportunity ?? ""));
}

export function linkWhatsapp(numero: string | null | undefined, texto: string) {
  const digitos = String(numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10 || digitos.startsWith("0800")) return null;
  const comPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}
