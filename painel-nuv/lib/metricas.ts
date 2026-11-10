import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
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

export type ArquivoEnviado = { nome: string; tipo: string; base64: string; periodo: "atual" | "anterior" };

const SISTEMA = `Você é analista de social media de uma agência brasileira.
Recebe prints do painel profissional do Instagram/TikTok/LinkedIn e/ou PDFs de relatório e transforma em dados.

Regras:
- Transcreva só números que aparecem nos arquivos. Nunca invente nem estime. Sem dado: null.
- Converta "1,2 mil" para 1200, "3,4 mi" para 3400000, "12,5%" para 12.5.
- Arquivos marcados como PERÍODO ANTERIOR alimentam periodo_anterior. Se o próprio print mostrar a comparação
  ("+12% vs período anterior"), calcule o valor anterior só quando for exato; caso contrário deixe null.
- Agrupe métricas iguais numa linha só.
- A análise deve ser direta e prática: o que funcionou, o que não funcionou e o que fazer no próximo período,
  citando números. Português do Brasil, sem emoji.`;

export async function extrairRelatorio(opts: {
  cliente: string;
  rede: string;
  periodoAtual: string;
  periodoAnterior: string | null;
  arquivos: ArquivoEnviado[];
}): Promise<Relatorio> {
  const client = new Anthropic();
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];

  for (const periodo of ["atual", "anterior"] as const) {
    const lista = opts.arquivos.filter((a) => a.periodo === periodo);
    if (!lista.length) continue;
    conteudo.push({
      type: "text",
      text: periodo === "atual" ? `PERÍODO ATUAL (${opts.periodoAtual}):` : `PERÍODO ANTERIOR (${opts.periodoAnterior ?? "anterior"}):`,
    });
    for (const a of lista) {
      if (a.tipo === "application/pdf") {
        conteudo.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.base64 }, title: a.nome });
      } else {
        const mt = (["image/png", "image/jpeg", "image/gif", "image/webp"].includes(a.tipo) ? a.tipo : "image/jpeg") as
          | "image/png"
          | "image/jpeg"
          | "image/gif"
          | "image/webp";
        conteudo.push({ type: "image", source: { type: "base64", media_type: mt, data: a.base64 } });
      }
    }
  }
  conteudo.push({
    type: "text",
    text: `Cliente: ${opts.cliente}. Rede: ${opts.rede}. Extraia as métricas e escreva a análise.`,
  });

  const resposta = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(RelatorioSchema) },
    system: SISTEMA,
    messages: [{ role: "user", content: conteudo }],
  });

  if (resposta.stop_reason === "refusal") throw new Error("O modelo recusou analisar esses arquivos.");
  if (resposta.stop_reason === "max_tokens") throw new Error("Resposta cortada: envie menos arquivos por vez.");
  if (!resposta.parsed_output) throw new Error("Não consegui ler os dados dos arquivos. Tente prints mais nítidos.");
  return resposta.parsed_output;
}
