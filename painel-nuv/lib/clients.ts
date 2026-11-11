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
  /** id do quadro do Trello; vazio = procura um quadro com o nome do cliente */
  trello_board?: string | null;
};

/** O que o navegador precisa saber de cada calendário. */
export type CalendarioPublico = Pick<Calendario, "id" | "nome" | "cor">;

/**
 * Cores da NUV (azuis, cinzas e preto), em ordem fixa. O nome do cliente sempre aparece junto da cor.
 * Clientes novos recebem a próxima cor livre.
 */
export const PALETA = ["#1f3fd1", "#121212", "#7d95ff", "#8a8f98", "#0b1f7a", "#b4c3ff", "#4a4a4a", "#3b5bfd"];
