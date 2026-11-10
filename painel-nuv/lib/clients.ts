// Tipos e cores dos calendários. Os calendários em si ficam na tabela "calendarios"
// do Supabase e são descobertos sozinhos no Notion (ver lib/calendarios.ts).

export type Campos = {
  titulo: string;
  data: string;
  formato?: string;
  rede?: string;
  status?: string;
  etapa?: string;
  pilar?: string;
  arquivos?: string;
  legenda?: string;
  referencias?: string;
  /** Checkboxes do fluxo de produção, na ordem em que acontecem. */
  checks?: { conteudo?: string; arte?: string; aprovacao?: string; postado?: string };
};

export type Calendario = {
  id: string;
  nome: string;
  database_id: string;
  titulo_notion: string | null;
  cor: string;
  campos: Campos;
  ativo: boolean;
  origem: "auto" | "manual";
};

/** O que o navegador precisa saber de cada calendário. */
export type CalendarioPublico = Pick<Calendario, "id" | "nome" | "cor">;

/**
 * Paleta categórica validada para daltonismo, em ordem fixa.
 * Clientes novos recebem a próxima cor livre.
 */
export const PALETA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
