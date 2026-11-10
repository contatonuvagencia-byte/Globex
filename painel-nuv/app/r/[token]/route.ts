import { gerarHtmlCliente, type RelatorioSalvo } from "@/lib/relatorio-cliente";
import { db } from "@/lib/supabase";

// Página pública do relatório (sem login). Só abre com o token gerado no painel.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const naoEncontrado = () =>
    new Response("<!doctype html><meta charset=utf-8><title>Link indisponível</title><p style='font-family:system-ui;padding:40px'>Este link de relatório não está mais disponível.</p>", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(params.token)) return naoEncontrado();
  let data = null;
  try {
    ({ data } = await db().from("metricas_relatorios").select("*").eq("token_publico", params.token).maybeSingle());
  } catch {
    return naoEncontrado();
  }
  if (!data) return naoEncontrado();
  return new Response(gerarHtmlCliente(data as RelatorioSalvo), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, max-age=60",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
    },
  });
}
