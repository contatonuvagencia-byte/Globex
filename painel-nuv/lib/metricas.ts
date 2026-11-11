import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { RelatorioSchema, SISTEMA_METRICAS, type Relatorio } from "./relatorio-schema";

export { RelatorioSchema, type Relatorio };

export type ArquivoEnviado = { nome: string; tipo: string; base64: string; periodo: "atual" | "anterior" };



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
    system: SISTEMA_METRICAS,
    messages: [{ role: "user", content: conteudo }],
  });

  if (resposta.stop_reason === "refusal") throw new Error("O modelo recusou analisar esses arquivos.");
  if (resposta.stop_reason === "max_tokens") throw new Error("Resposta cortada: envie menos arquivos por vez.");
  if (!resposta.parsed_output) throw new Error("Não consegui ler os dados dos arquivos. Tente prints mais nítidos.");
  return resposta.parsed_output;
}
