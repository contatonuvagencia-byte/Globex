export type Post = {
  id: string;
  cliente: string; // slug
  titulo: string;
  data: string; // YYYY-MM-DD
  hora: string | null; // HH:mm (horário de Brasília) quando o post tem horário
  formato: string | null;
  redes: string[];
  status: string;
  pilar: string | null;
  notionUrl: string;
  checks: { nome: string; feito: boolean }[] | null;
};

export type Midia = { tipo: "imagem" | "video" | "arquivo"; url: string; nome: string };

export type Secao = { titulo: string; texto: string };

export type PostDetalhe = Post & {
  legenda: string | null;
  copy: string | null;
  referencias: string | null;
  outrasSecoes: Secao[];
  midias: Midia[];
};
