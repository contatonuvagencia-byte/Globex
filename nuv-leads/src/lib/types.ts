export type Status = "novo" | "contatado" | "respondeu" | "reuniao" | "proposta" | "fechado" | "perdido";
export type Niche = "saude" | "b2b" | "institucional" | "outro";
export type IgStatus = "desconhecido" | "inexistente" | "parado" | "fraco" | "ativo";
export type SiteStatus = "desconhecido" | "sem_site" | "fraco" | "bom";
export type Size = "desconhecido" | "pequeno" | "medio" | "grande";
export type Channel = "whatsapp" | "instagram" | "email";

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  niche: Niche;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  site_status: SiteStatus;
  instagram: string | null;
  ig_status: IgStatus;
  ig_followers: number | null;
  ig_last_post: string | null;
  google_rating: number | null;
  google_reviews: number | null;
  maps_url: string | null;
  size: Size;
  units: number | null;
  diagnosis: string | null;
  opportunity: string | null;
  message: string | null;
  score: number;
  status: Status;
  next_followup_at: string | null;
  last_contact_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  source: string | null;
}

export interface Interaction {
  id: string;
  lead_id: string;
  created_at: string;
  type: "whatsapp" | "instagram" | "email" | "ligacao" | "reuniao" | "nota" | "status";
  content: string | null;
  created_by: string | null;
}

export interface Template {
  id: string;
  name: string;
  niche: Niche | null;
  channel: Channel | "followup";
  subject: string | null;
  body: string;
}

export const STATUSES: { key: Status; label: string; hint: string }[] = [
  { key: "novo", label: "Novos", hint: "Ainda não abordados" },
  { key: "contatado", label: "Contatados", hint: "Mensagem enviada" },
  { key: "respondeu", label: "Responderam", hint: "Conversa ativa" },
  { key: "reuniao", label: "Reunião", hint: "Call marcada" },
  { key: "proposta", label: "Proposta", hint: "Proposta enviada" },
  { key: "fechado", label: "Fechados", hint: "Viraram cliente" },
  { key: "perdido", label: "Perdidos", hint: "Não avançou" },
];

export const NICHES: Record<Niche, string> = {
  saude: "Saúde e estética",
  b2b: "B2B / serviços",
  institucional: "Institucional / imóveis",
  outro: "Outro",
};

export const IG_LABEL: Record<IgStatus, string> = {
  desconhecido: "Não verificado",
  inexistente: "Sem Instagram",
  parado: "Parado",
  fraco: "Fraco",
  ativo: "Ativo",
};

export const SITE_LABEL: Record<SiteStatus, string> = {
  desconhecido: "Não verificado",
  sem_site: "Sem site",
  fraco: "Site fraco",
  bom: "Site bom",
};

export const SIZE_LABEL: Record<Size, string> = {
  desconhecido: "Não verificado",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
};

// Dias até o próximo follow-up quando o lead entra em cada etapa
export const FOLLOWUP_DAYS: Partial<Record<Status, number>> = {
  contatado: 3,
  respondeu: 2,
  proposta: 4,
};
