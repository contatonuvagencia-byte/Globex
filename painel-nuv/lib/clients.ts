// Mapa dos calendários de conteúdo no Notion.
// Cada cliente usa nomes de campos diferentes; aqui a gente diz qual campo é qual.
// Para adicionar um cliente novo: copie um bloco, troque o ID do banco e os nomes dos campos.

export type ClientConfig = {
  slug: string;
  nome: string;
  /** Cor do cliente no calendário (paleta categórica validada para daltonismo). */
  cor: string;
  /** ID do banco de dados do Notion (o trecho de 32 caracteres da URL). */
  databaseId: string;
  campos: {
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
};

const CHECKS_GESTAO_MIDIAS = {
  conteudo: "Conteúdo/legenda",
  arte: "Arte/gravação",
  aprovacao: "Aprovação do cliente",
  postado: "Programado/Postado",
};

export const CLIENTES: ClientConfig[] = [
  {
    slug: "globex",
    nome: "Globex",
    cor: "#2a78d6",
    databaseId: "f3e57bd0e43f42bc94506a876afc5de2", // 📦 Calendário Editorial — Globex Cargo
    campos: {
      titulo: "Título",
      data: "Data de Publicação",
      formato: "Formato",
      rede: "Plataforma",
      status: "Status",
      pilar: "Pilar",
    },
  },
  {
    slug: "beawst",
    nome: "Beawst",
    cor: "#eb6834",
    databaseId: "73a07ce018a783dda547011ac12a71e5", // GESTÃO DE MÍDIAS - Beawst
    campos: {
      titulo: "Head",
      data: "Data de veiculação",
      formato: "Formato",
      rede: "Rede social",
      etapa: "Etapa",
      arquivos: "Arquivos e mídia",
      referencias: "Referências",
      checks: CHECKS_GESTAO_MIDIAS,
    },
  },
  {
    slug: "sinait",
    nome: "SINAIT",
    cor: "#1baf7a",
    databaseId: "2b907ce018a781cfac81f13f1d78c402", // GESTÃO DE MÍDIAS - SINAIT
    campos: {
      titulo: "Head",
      data: "Data de veiculação",
      rede: "Rede social",
      etapa: "Etapa",
      referencias: "Referências",
      checks: CHECKS_GESTAO_MIDIAS,
    },
  },
];

export function clientePorSlug(slug: string) {
  return CLIENTES.find((c) => c.slug === slug);
}
