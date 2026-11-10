"use client";
import { useMemo, useState } from "react";
import { num, pct } from "@/lib/format";

export type Metrica = { nome: string; grupo: string; periodo_atual: number | null; periodo_anterior: number | null; unidade: string };
export type PostMetrica = {
  descricao: string;
  formato: string | null;
  data: string | null;
  visualizacoes: number | null;
  alcance: number | null;
  curtidas: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
};
export type Analise = { resumo: string; deu_certo: string[]; deu_errado: string[]; recomendacoes: string[] };
export type DadosRelatorio = {
  cliente: string;
  rede: string;
  periodo_atual: string;
  periodo_anterior: string | null;
  perfil: string | null;
  metricas: Metrica[];
  posts: PostMetrica[];
  analise: Analise;
};

// métricas em que subir é ruim
const INVERTIDA = /deixaram|unfollow|perd|custo|cpc|cpm|rejei/i;

function variacao(m: Metrica) {
  if (m.periodo_atual === null || m.periodo_anterior === null) return { abs: null, rel: null };
  const abs = m.periodo_atual - m.periodo_anterior;
  const rel = m.periodo_anterior !== 0 ? (abs / Math.abs(m.periodo_anterior)) * 100 : null;
  return { abs, rel };
}

function Tendencia({ m }: { m: Metrica }) {
  const { abs, rel } = variacao(m);
  if (abs === null) return <span className="text-ink-3">–</span>;
  if (abs === 0) return <span className="text-ink-2">= 0</span>;
  const bom = INVERTIDA.test(m.nome) ? abs < 0 : abs > 0;
  return (
    <span className={`tabular font-medium ${bom ? "text-[#0f6b2f]" : "text-[#b42318]"}`}>
      {abs > 0 ? "▲" : "▼"} {pct(rel)}
    </span>
  );
}

const COLS_POST = [
  ["visualizacoes", "Visualizações"],
  ["alcance", "Alcance"],
  ["curtidas", "Curtidas"],
  ["comentarios", "Coment."],
  ["compartilhamentos", "Compart."],
  ["salvamentos", "Salvam."],
] as const;

function engajamento(p: PostMetrica) {
  const base = p.alcance ?? p.visualizacoes;
  if (!base) return null;
  const inter = (p.curtidas ?? 0) + (p.comentarios ?? 0) + (p.compartilhamentos ?? 0) + (p.salvamentos ?? 0);
  return (inter / base) * 100;
}

function CampoNumero({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      inputMode="decimal"
      className="input tabular w-28 py-1 text-right"
      defaultValue={valor === null ? "" : String(valor).replace(".", ",")}
      onBlur={(e) => {
        const t = e.target.value.trim().replace(/\./g, "").replace(",", ".");
        onChange(t === "" ? null : Number.isFinite(Number(t)) ? Number(t) : valor);
      }}
    />
  );
}

export async function exportarXlsx(r: DadosRelatorio) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const metricas = r.metricas.map((m) => {
    const v = variacao(m);
    return {
      Grupo: m.grupo,
      Métrica: m.nome,
      Unidade: m.unidade,
      [`Anterior (${r.periodo_anterior ?? "-"})`]: m.periodo_anterior,
      [`Atual (${r.periodo_atual})`]: m.periodo_atual,
      Variação: v.abs,
      "Variação %": v.rel === null ? null : Number(v.rel.toFixed(2)),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metricas), "Métricas");
  const posts = r.posts.map((p) => ({
    Data: p.data,
    Formato: p.formato,
    Post: p.descricao,
    Visualizações: p.visualizacoes,
    Alcance: p.alcance,
    Curtidas: p.curtidas,
    Comentários: p.comentarios,
    Compartilhamentos: p.compartilhamentos,
    Salvamentos: p.salvamentos,
    "Engajamento %": engajamento(p) === null ? null : Number(engajamento(p)!.toFixed(2)),
  }));
  if (posts.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(posts), "Posts");
  const analise = [
    ["Resumo", r.analise.resumo],
    [],
    ["O que deu certo"],
    ...r.analise.deu_certo.map((t) => ["", t]),
    [],
    ["O que deu errado"],
    ...r.analise.deu_errado.map((t) => ["", t]),
    [],
    ["Recomendações"],
    ...r.analise.recomendacoes.map((t) => ["", t]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(analise), "Análise");
  const nome = `Relatorio_${r.cliente}_${r.rede}_${r.periodo_atual}`.replace(/[^\w\-]+/g, "_");
  XLSX.writeFile(wb, `${nome}.xlsx`);
}

export function RelatorioView({
  dados,
  editavel,
  onChange,
}: {
  dados: DadosRelatorio;
  editavel?: boolean;
  onChange?: (d: DadosRelatorio) => void;
}) {
  const [ordem, setOrdem] = useState<(typeof COLS_POST)[number][0] | "eng">("alcance");
  const grupos = useMemo(() => {
    const g = new Map<string, { m: Metrica; i: number }[]>();
    dados.metricas.forEach((m, i) => g.set(m.grupo || "Outros", [...(g.get(m.grupo || "Outros") ?? []), { m, i }]));
    return [...g.entries()];
  }, [dados.metricas]);

  const postsOrdenados = useMemo(() => {
    const val = (p: PostMetrica) => (ordem === "eng" ? engajamento(p) : p[ordem]) ?? -1;
    return [...dados.posts].sort((a, b) => val(b) - val(a));
  }, [dados.posts, ordem]);

  const maiores = useMemo(() => {
    const r: Record<string, number> = {};
    for (const [k] of COLS_POST) r[k] = Math.max(-1, ...dados.posts.map((p) => p[k] ?? -1));
    return r;
  }, [dados.posts]);

  function setMetrica(i: number, campo: "periodo_atual" | "periodo_anterior", v: number | null) {
    const metricas = dados.metricas.map((m, j) => (j === i ? { ...m, [campo]: v } : m));
    onChange?.({ ...dados, metricas });
  }

  const listas: [string, string[], string, keyof Analise][] = [
    ["O que deu certo", dados.analise.deu_certo, "✓", "deu_certo"],
    ["O que deu errado", dados.analise.deu_errado, "✗", "deu_errado"],
    ["Recomendações", dados.analise.recomendacoes, "→", "recomendacoes"],
  ];
  const setAnalise = (campo: keyof Analise, valor: string | string[]) =>
    onChange?.({ ...dados, analise: { ...dados.analise, [campo]: valor } });

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">Resumo do período</h3>
        {editavel ? (
          <textarea
            className="input mt-2 min-h-[90px] leading-relaxed"
            defaultValue={dados.analise.resumo}
            onBlur={(e) => setAnalise("resumo", e.target.value)}
            aria-label="Resumo do período"
          />
        ) : (
          <p className="mt-2 text-sm leading-relaxed">{dados.analise.resumo}</p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {listas.map(([titulo, itens, icone, campo]) => (
            <div key={titulo} className="rounded-xl bg-surface p-4">
              <h4 className="text-sm font-semibold">{titulo}{campo === "deu_errado" ? <span className="font-normal text-ink-3"> · na versão do cliente: “Pontos de atenção”</span> : null}</h4>
              {editavel ? (
                <>
                  <textarea
                    className="input mt-2 min-h-[120px] text-sm"
                    defaultValue={itens.join("\n")}
                    onBlur={(e) => setAnalise(campo, e.target.value.split("\n").map((t) => t.trim()).filter(Boolean))}
                    aria-label={titulo}
                  />
                  <p className="mt-1 text-[11px] text-ink-3">Um item por linha</p>
                </>
              ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {itens.length ? (
                  itens.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ink-2" aria-hidden>{icone}</span>
                      <span>{t}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-ink-3">–</li>
                )}
              </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
          <h3 className="text-sm font-semibold">Planilha de métricas</h3>
          {editavel && <span className="text-xs text-ink-2">Confira os números e corrija se algo foi lido errado</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface text-left text-xs text-ink-2">
              <tr>
                <th className="px-5 py-2 font-medium">Métrica</th>
                <th className="px-3 py-2 text-right font-medium">Anterior{dados.periodo_anterior ? ` · ${dados.periodo_anterior}` : ""}</th>
                <th className="px-3 py-2 text-right font-medium">Atual · {dados.periodo_atual}</th>
                <th className="px-5 py-2 text-right font-medium">Variação</th>
              </tr>
            </thead>
            {grupos.map(([grupo, linhas]) => (
              <tbody key={grupo}>
                <tr>
                  <td colSpan={4} className="bg-white px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{grupo}</td>
                </tr>
                {linhas.map(({ m, i }) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-5 py-2">{m.nome}{m.unidade === "%" ? " (%)" : ""}</td>
                    <td className="tabular px-3 py-2 text-right text-ink-2">
                      {editavel ? <CampoNumero valor={m.periodo_anterior} onChange={(v) => setMetrica(i, "periodo_anterior", v)} /> : num(m.periodo_anterior)}
                    </td>
                    <td className="tabular px-3 py-2 text-right font-medium">
                      {editavel ? <CampoNumero valor={m.periodo_atual} onChange={(v) => setMetrica(i, "periodo_atual", v)} /> : num(m.periodo_atual)}
                    </td>
                    <td className="px-5 py-2 text-right"><Tendencia m={m} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {dados.posts.length > 0 && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
            <h3 className="mr-auto text-sm font-semibold">Desempenho por post</h3>
            <label className="text-xs text-ink-2" htmlFor="ordem">Ordenar por</label>
            <select id="ordem" className="input w-auto py-1 text-xs" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}>
              {COLS_POST.map(([k, r]) => (
                <option key={k} value={k}>{r}</option>
              ))}
              <option value="eng">Engajamento %</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface text-left text-xs text-ink-2">
                <tr>
                  <th className="px-5 py-2 font-medium">Post</th>
                  {COLS_POST.map(([k, r]) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">{r}</th>
                  ))}
                  <th className="px-5 py-2 text-right font-medium">Engaj. %</th>
                </tr>
              </thead>
              <tbody>
                {postsOrdenados.map((p, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="max-w-[260px] px-5 py-2">
                      <p className="line-clamp-2">{p.descricao}</p>
                      <p className="text-xs text-ink-3">{[p.formato, p.data].filter(Boolean).join(" · ")}</p>
                    </td>
                    {COLS_POST.map(([k]) => (
                      <td key={k} className={`tabular px-3 py-2 text-right ${p[k] !== null && p[k] === maiores[k] && dados.posts.length > 1 ? "font-semibold text-nuv" : ""}`}>
                        {num(p[k])}
                      </td>
                    ))}
                    <td className="tabular px-5 py-2 text-right">{engajamento(p) === null ? "–" : `${engajamento(p)!.toFixed(1).replace(".", ",")}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-2 text-xs text-ink-3">Em roxo: o melhor resultado de cada coluna. Engajamento = (curtidas + comentários + compartilhamentos + salvamentos) ÷ alcance.</p>
        </section>
      )}
    </div>
  );
}
