// Áreas do painel e perfis de acesso (usado no servidor e na tela).

export const AREAS = {
  calendario: "Calendário",
  clientes: "Fichas de clientes",
  demandas: "Demandas",
  metricas: "Métricas",
  leads: "Leads",
  servicos: "Serviços freela",
  financeiro: "Financeiro",
} as const;
export type Area = keyof typeof AREAS;
export type Nivel = "nenhum" | "ver" | "editar";
export type Permissoes = Record<Area, Nivel>;

const tudo = (n: Nivel): Permissoes => ({ calendario: n, clientes: n, demandas: n, metricas: n, leads: n, servicos: n, financeiro: n });

/** Perfis prontos. "Personalizado" deixa escolher área por área. */
export const PERFIS: Record<string, { nome: string; descricao: string; permissoes: Permissoes }> = {
  admin: { nome: "Administração", descricao: "Tudo, inclusive Financeiro e Equipe", permissoes: tudo("editar") },
  social: {
    nome: "Social media",
    descricao: "Edita calendário, demandas e métricas; não vê Leads, Serviços e Financeiro",
    permissoes: { ...tudo("nenhum"), calendario: "editar", clientes: "ver", demandas: "editar", metricas: "editar" },
  },
  design: {
    nome: "Design / vídeo",
    descricao: "Vê o calendário e edita as próprias demandas",
    permissoes: { ...tudo("nenhum"), calendario: "ver", demandas: "editar" },
  },
  comercial: {
    nome: "Comercial",
    descricao: "Edita Leads e Serviços; vê o calendário",
    permissoes: { ...tudo("nenhum"), calendario: "ver", clientes: "ver", leads: "editar", servicos: "editar" },
  },
  leitura: {
    nome: "Só visualizar",
    descricao: "Vê tudo menos Financeiro, sem editar nada",
    permissoes: { ...tudo("ver"), financeiro: "nenhum" },
  },
  personalizado: { nome: "Personalizado", descricao: "Você escolhe área por área", permissoes: tudo("nenhum") },
};

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string | null;
  papel: string;
  permissoes: Permissoes;
  clientes: string[];
  admin: boolean;
  foto?: string | null;
};

const ORDEM: Record<Nivel, number> = { nenhum: 0, ver: 1, editar: 2 };

export function nivelDe(u: Pick<UsuarioPublico, "admin" | "permissoes"> | null | undefined, area: Area): Nivel {
  if (!u) return "nenhum";
  if (u.admin) return "editar";
  return u.permissoes?.[area] ?? "nenhum";
}

export function pode(u: Pick<UsuarioPublico, "admin" | "permissoes"> | null | undefined, area: Area, nivel: Exclude<Nivel, "nenhum">) {
  return ORDEM[nivelDe(u, area)] >= ORDEM[nivel];
}

/** Clientes vazios = vê todos. */
export function veCliente(u: Pick<UsuarioPublico, "admin" | "clientes"> | null | undefined, cliente: string | null | undefined) {
  if (!u) return false;
  if (u.admin || !u.clientes?.length) return true;
  if (!cliente) return false;
  return u.clientes.some((c) => c.toLowerCase() === cliente.toLowerCase());
}

export function normalizarPermissoes(p: Partial<Record<string, string>> | null | undefined): Permissoes {
  const r = tudo("nenhum");
  for (const a of Object.keys(AREAS) as Area[]) {
    const v = p?.[a];
    if (v === "ver" || v === "editar") r[a] = v;
  }
  return r;
}
