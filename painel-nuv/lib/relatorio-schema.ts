// Formato do relatório de métricas, compartilhado entre servidor e navegador.
// Também gera o texto para usar no Claude (claude.ai) sem custo de API
// e uma análise automática simples para quando os números são digitados à mão.
import { z } from "zod";

export const RelatorioSchema = z.object({
  perfil: z.string().nullable().describe("@ do perfil, se aparecer nos prints"),
  metricas: z
    .array(
      z.object({
        nome: z.string().describe("Nome da métrica em português, ex.: Contas alcançadas"),
        grupo: z.string().describe("Alcance, Engajamento, Seguidores, Conteúdo, Perfil ou Outros"),
        periodo_atual: z.number().nullable(),
        periodo_anterior: z.number().nullable(),
        unidade: z.string().describe("'número', '%' ou 'R$'"),
      }),
    )
    .describe("Uma linha por métrica. Use null quando o número não aparece."),
  posts: z
    .array(
      z.object({
        descricao: z.string().describe("Legenda resumida ou tema do post"),
        formato: z.string().nullable(),
        data: z.string().nullable().describe("AAAA-MM-DD quando visível"),
        visualizacoes: z.number().nullable(),
        alcance: z.number().nullable(),
        curtidas: z.number().nullable(),
        comentarios: z.number().nullable(),
        compartilhamentos: z.number().nullable(),
        salvamentos: z.number().nullable(),
      }),
    )
    .describe("Posts do período atual que aparecem com números individuais."),
  analise: z.object({
    resumo: z.string().describe("2 a 4 frases sobre o período"),
    deu_certo: z.array(z.string()),
    deu_errado: z.array(z.string()),
    recomendacoes: z.array(z.string()),
  }),
});

export type Relatorio = z.infer<typeof RelatorioSchema>;
export type MetricaRel = Relatorio["metricas"][number];

export const SISTEMA_METRICAS = `Você é analista de social media de uma agência brasileira.
Recebe prints do painel profissional do Instagram/TikTok/LinkedIn e/ou PDFs de relatório e transforma em dados.

Regras:
- Transcreva só números que aparecem nos arquivos. Nunca invente nem estime. Sem dado: null.
- Converta "1,2 mil" para 1200, "3,4 mi" para 3400000, "12,5%" para 12.5.
- Arquivos marcados como PERÍODO ANTERIOR alimentam periodo_anterior. Se o próprio print mostrar a comparação
  ("+12% vs período anterior"), calcule o valor anterior só quando for exato; caso contrário deixe null.
- Agrupe métricas iguais numa linha só.
- A análise deve ser direta e prática: o que funcionou, o que não funcionou e o que fazer no próximo período,
  citando números. Português do Brasil, sem emoji.`;

/** Texto para colar no Claude (claude.ai) junto com os prints. A resposta volta como JSON para colar no painel. */
export function pedidoParaClaude(o: { cliente: string; rede: string; periodoAtual: string; periodoAnterior: string }) {
  return `${SISTEMA_METRICAS}

Cliente: ${o.cliente}. Rede: ${o.rede}.
Período atual: ${o.periodoAtual}. Período anterior: ${o.periodoAnterior || "não enviado"}.
Vou anexar os prints. Diga no começo da mensagem quais prints são do período anterior, se houver.

Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois, exatamente neste formato:
{
  "perfil": "@perfil ou null",
  "metricas": [
    { "nome": "Contas alcançadas", "grupo": "Alcance", "periodo_atual": 48210, "periodo_anterior": 31900, "unidade": "número" }
  ],
  "posts": [
    { "descricao": "tema do post", "formato": "Reel", "data": "2026-10-22", "visualizacoes": 61000, "alcance": 24000,
      "curtidas": 1300, "comentarios": 64, "compartilhamentos": 180, "salvamentos": 90 }
  ],
  "analise": {
    "resumo": "2 a 4 frases",
    "deu_certo": ["..."],
    "deu_errado": ["..."],
    "recomendacoes": ["..."]
  }
}
Grupos possíveis: Alcance, Engajamento, Seguidores, Conteúdo, Perfil, Outros. Unidade: "número", "%" ou "R$".`;
}

/** Lê o JSON colado (aceita a resposta com ```json ... ``` e números como texto). */
export function lerJsonColado(texto: string): Relatorio {
  const bloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? texto;
  const inicio = bloco.indexOf("{");
  const fim = bloco.lastIndexOf("}");
  if (inicio < 0 || fim < inicio) throw new Error("Não encontrei o JSON na resposta. Copie a resposta inteira do Claude.");
  let bruto: unknown;
  try {
    bruto = JSON.parse(bloco.slice(inicio, fim + 1));
  } catch {
    throw new Error("A resposta veio cortada ou com erro. Peça ao Claude: “responda de novo só com o JSON completo”.");
  }
  const numero = z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return v;
    const n = Number(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }, z.number().nullable());
  const tolerante = z.object({
    perfil: z.string().nullable().catch(null),
    metricas: z
      .array(
        z.object({
          nome: z.string(),
          grupo: z.string().catch("Outros"),
          periodo_atual: numero.catch(null),
          periodo_anterior: numero.catch(null),
          unidade: z.string().catch("número"),
        }),
      )
      .catch([]),
    posts: z
      .array(
        z.object({
          descricao: z.string().catch(""),
          formato: z.string().nullable().catch(null),
          data: z.string().nullable().catch(null),
          visualizacoes: numero.catch(null),
          alcance: numero.catch(null),
          curtidas: numero.catch(null),
          comentarios: numero.catch(null),
          compartilhamentos: numero.catch(null),
          salvamentos: numero.catch(null),
        }),
      )
      .catch([]),
    analise: z
      .object({
        resumo: z.string().catch(""),
        deu_certo: z.array(z.string()).catch([]),
        deu_errado: z.array(z.string()).catch([]),
        recomendacoes: z.array(z.string()).catch([]),
      })
      .catch({ resumo: "", deu_certo: [], deu_errado: [], recomendacoes: [] }),
  });
  const r = tolerante.parse(bruto);
  if (!r.metricas.length) throw new Error("A resposta não trouxe nenhuma métrica. Confira se os prints foram anexados.");
  return r;
}

/* ---------- Métricas digitadas à mão ---------- */

export const METRICAS_PADRAO: Record<string, { nome: string; grupo: string; unidade: string }[]> = {
  Instagram: [
    { nome: "Contas alcançadas", grupo: "Alcance", unidade: "número" },
    { nome: "Visualizações", grupo: "Alcance", unidade: "número" },
    { nome: "Contas com engajamento", grupo: "Engajamento", unidade: "número" },
    { nome: "Interações", grupo: "Engajamento", unidade: "número" },
    { nome: "Curtidas", grupo: "Engajamento", unidade: "número" },
    { nome: "Comentários", grupo: "Engajamento", unidade: "número" },
    { nome: "Compartilhamentos", grupo: "Engajamento", unidade: "número" },
    { nome: "Salvamentos", grupo: "Engajamento", unidade: "número" },
    { nome: "Seguidores (total)", grupo: "Seguidores", unidade: "número" },
    { nome: "Novos seguidores", grupo: "Seguidores", unidade: "número" },
    { nome: "Deixaram de seguir", grupo: "Seguidores", unidade: "número" },
    { nome: "Visitas ao perfil", grupo: "Perfil", unidade: "número" },
    { nome: "Cliques no link", grupo: "Perfil", unidade: "número" },
    { nome: "Posts publicados", grupo: "Conteúdo", unidade: "número" },
  ],
  TikTok: [
    { nome: "Visualizações de vídeo", grupo: "Alcance", unidade: "número" },
    { nome: "Visualizações do perfil", grupo: "Perfil", unidade: "número" },
    { nome: "Curtidas", grupo: "Engajamento", unidade: "número" },
    { nome: "Comentários", grupo: "Engajamento", unidade: "número" },
    { nome: "Compartilhamentos", grupo: "Engajamento", unidade: "número" },
    { nome: "Seguidores (total)", grupo: "Seguidores", unidade: "número" },
    { nome: "Novos seguidores", grupo: "Seguidores", unidade: "número" },
  ],
  LinkedIn: [
    { nome: "Impressões", grupo: "Alcance", unidade: "número" },
    { nome: "Visitantes da página", grupo: "Perfil", unidade: "número" },
    { nome: "Reações", grupo: "Engajamento", unidade: "número" },
    { nome: "Comentários", grupo: "Engajamento", unidade: "número" },
    { nome: "Compartilhamentos", grupo: "Engajamento", unidade: "número" },
    { nome: "Taxa de engajamento", grupo: "Engajamento", unidade: "%" },
    { nome: "Seguidores (total)", grupo: "Seguidores", unidade: "número" },
    { nome: "Novos seguidores", grupo: "Seguidores", unidade: "número" },
  ],
};

const INVERTIDA = /deixaram|unfollow|perd|custo|cpc|cpm|rejei/i;
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Análise de ponto de partida, feita por regras (sem IA). Você revisa e completa antes de enviar. */
export function analiseAutomatica(metricas: MetricaRel[], periodoAnterior: string | null): Relatorio["analise"] {
  const comparaveis = metricas
    .filter((m) => m.periodo_atual !== null && m.periodo_anterior !== null && m.periodo_anterior !== 0)
    .map((m) => {
      const rel = ((m.periodo_atual! - m.periodo_anterior!) / Math.abs(m.periodo_anterior!)) * 100;
      const bom = INVERTIDA.test(m.nome) ? rel < 0 : rel > 0;
      const u = m.unidade === "%" ? "%" : "";
      const frase = `${m.nome}: ${fmt.format(m.periodo_anterior!)}${u} → ${fmt.format(m.periodo_atual!)}${u} (${rel > 0 ? "+" : ""}${fmt.format(rel)}%)`;
      return { m, rel, bom, frase };
    })
    .filter((x) => Math.abs(x.rel) >= 1);

  const melhores = comparaveis.filter((x) => x.bom).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
  const piores = comparaveis.filter((x) => !x.bom).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));

  let resumo = "";
  if (comparaveis.length) {
    resumo = `Em relação a ${periodoAnterior ?? "o período anterior"}, ${melhores.length} de ${comparaveis.length} métricas comparáveis melhoraram.`;
    if (melhores[0]) resumo += ` O maior avanço foi em ${melhores[0].m.nome.toLowerCase()} (${melhores[0].rel > 0 ? "+" : ""}${fmt.format(melhores[0].rel)}%).`;
    if (piores[0]) resumo += ` O ponto que mais pede atenção é ${piores[0].m.nome.toLowerCase()} (${fmt.format(piores[0].rel)}%).`;
  } else {
    resumo = "Preencha os números do período anterior para ver a comparação.";
  }

  return {
    resumo,
    deu_certo: melhores.slice(0, 4).map((x) => x.frase),
    deu_errado: piores.slice(0, 4).map((x) => x.frase),
    recomendacoes: [],
  };
}
