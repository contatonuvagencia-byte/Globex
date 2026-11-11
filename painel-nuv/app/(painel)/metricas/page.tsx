"use client";
import { useEffect, useState } from "react";
import { exportarXlsx, RelatorioView, type DadosRelatorio } from "@/components/RelatorioView";
import { MESES, hojeISO } from "@/lib/format";
import { METRICAS_PADRAO, analiseAutomatica, lerJsonColado, pedidoParaClaude } from "@/lib/relatorio-schema";

type Resumo = { id: string; cliente: string; rede: string; periodo_atual: string; periodo_anterior: string | null; created_at: string };
type Gravado = DadosRelatorio & { id: string; token_publico: string | null };

const REDES = ["Instagram", "TikTok", "LinkedIn", "Facebook", "YouTube"];

/** Reduz prints grandes antes de enviar (mais rápido e cabe no limite da hospedagem). */
async function prepararArquivo(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 600_000) return f;
  const img = await createImageBitmap(f);
  const escala = Math.min(1, 1800 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob ? new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : f;
}

function periodoPadrao() {
  const [a, m] = hojeISO().split("-").map(Number);
  const atual = new Date(Date.UTC(a, m - 2, 1));
  const anterior = new Date(Date.UTC(a, m - 3, 1));
  const r = (d: Date) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return { atual: r(atual), anterior: r(anterior) };
}

function Dropzone({ titulo, ajuda, arquivos, setArquivos }: { titulo: string; ajuda: string; arquivos: File[]; setArquivos: (f: File[]) => void }) {
  const [arrastando, setArrastando] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        setArquivos([...arquivos, ...Array.from(e.dataTransfer.files)]);
      }}
      className={`block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${arrastando ? "border-nuv bg-nuv-soft" : "border-black/10 hover:border-nuv/50"}`}
    >
      <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => setArquivos([...arquivos, ...Array.from(e.target.files ?? [])])} />
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mt-1 text-xs text-ink-2">{ajuda}</p>
      {arquivos.length > 0 && (
        <ul className="mt-3 space-y-1 text-left text-xs">
          {arquivos.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="ml-auto text-ink-2 hover:text-[#b42318]"
                onClick={(e) => {
                  e.preventDefault();
                  setArquivos(arquivos.filter((_, j) => j !== i));
                }}
                aria-label={`Remover ${f.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

export default function Metricas() {
  const padrao = periodoPadrao();
  const [lista, setLista] = useState<Resumo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [novo, setNovo] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  const [cliente, setCliente] = useState("");
  const [rede, setRede] = useState("Instagram");
  const [pAtual, setPAtual] = useState(padrao.atual);
  const [pAnterior, setPAnterior] = useState(padrao.anterior);
  const [arqAtual, setArqAtual] = useState<File[]>([]);
  const [arqAnterior, setArqAnterior] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [rascunho, setRascunho] = useState<(DadosRelatorio & { arquivos: string[] }) | null>(null);
  const [aberto, setAberto] = useState<Gravado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [iaLigada, setIaLigada] = useState(false);
  const [modo, setModo] = useState<"claude" | "manual" | "ia">("claude");
  const [colado, setColado] = useState("");
  const [pedidoCopiado, setPedidoCopiado] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setIaLigada(Boolean(j.ia)))
      .catch(() => {});
  }, []);

  function abrirRascunho(dados: Omit<DadosRelatorio, "cliente" | "rede" | "periodo_atual" | "periodo_anterior">, comAnterior: boolean) {
    setRascunho({ cliente, rede, periodo_atual: pAtual, periodo_anterior: comAnterior ? pAnterior || null : null, arquivos: [], ...dados });
    setVersao((v) => v + 1);
    setNovo(false);
    setColado("");
  }

  function montarDoClaude() {
    setErro("");
    try {
      const r = lerJsonColado(colado);
      abrirRascunho(r, r.metricas.some((m) => m.periodo_anterior !== null));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function montarManual() {
    const base = METRICAS_PADRAO[rede] ?? METRICAS_PADRAO.Instagram;
    abrirRascunho(
      {
        perfil: null,
        metricas: base.map((m) => ({ ...m, periodo_atual: null, periodo_anterior: null })),
        posts: [],
        analise: { resumo: "", deu_certo: [], deu_errado: [], recomendacoes: [] },
      },
      true,
    );
  }

  function gerarAnaliseAutomatica() {
    if (!rascunho) return;
    const nova = analiseAutomatica(rascunho.metricas, rascunho.periodo_anterior);
    setRascunho({ ...rascunho, analise: { ...nova, recomendacoes: rascunho.analise.recomendacoes } });
    setVersao((v) => v + 1);
  }

  async function acaoRelatorio(corpo: unknown) {
    if (!aberto) return null;
    const r = await fetch(`/api/metricas/${aberto.id}`, { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) {
      setErro(j.erro ?? "Erro");
      return null;
    }
    return j;
  }

  async function publicar() {
    const j = await acaoRelatorio({ acao: "publicar" });
    if (j && aberto) setAberto({ ...aberto, token_publico: j.token });
  }

  async function despublicar() {
    if (!confirm("Desativar o link? Quem tiver o endereço não vai mais conseguir abrir.")) return;
    const j = await acaoRelatorio({ acao: "despublicar" });
    if (j && aberto) setAberto({ ...aberto, token_publico: null });
  }

  async function salvarEdicao() {
    if (!aberto) return;
    setSalvando(true);
    const j = await acaoRelatorio({ acao: "salvar", metricas: aberto.metricas, analise: { ...aberto.analise, perfil: aberto.perfil } });
    setSalvando(false);
    if (j) setEditando(false);
  }

  const linkPublico = aberto?.token_publico && typeof window !== "undefined" ? `${window.location.origin}/r/${aberto.token_publico}` : "";

  async function carregarLista() {
    const r = await fetch(`/api/metricas${filtro ? `?cliente=${encodeURIComponent(filtro)}` : ""}`);
    const j = await r.json();
    if (r.ok) setLista(j.relatorios ?? []);
    else setErro(j.erro);
  }
  useEffect(() => {
    fetch("/api/calendarios")
      .then((r) => r.json())
      .then((j) => {
        const nomes = [...new Set<string>((j.calendarios ?? []).filter((c: { ativo: boolean }) => c.ativo).map((c: { nome: string }) => c.nome))];
        setClientes(nomes);
        setCliente((atual) => atual || nomes[0] || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setProcessando(true);
    try {
      const fd = new FormData();
      fd.set("cliente", cliente);
      fd.set("rede", rede);
      fd.set("periodo_atual", pAtual);
      if (arqAnterior.length) fd.set("periodo_anterior", pAnterior);
      for (const f of arqAtual) fd.append("arquivos_atual", await prepararArquivo(f));
      for (const f of arqAnterior) fd.append("arquivos_anterior", await prepararArquivo(f));
      const r = await fetch("/api/metricas/extrair", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro ?? "Erro ao gerar relatório");
      setRascunho({
        cliente,
        rede,
        periodo_atual: pAtual,
        periodo_anterior: arqAnterior.length ? pAnterior : null,
        perfil: j.relatorio.perfil,
        metricas: j.relatorio.metricas,
        posts: j.relatorio.posts,
        analise: j.relatorio.analise,
        arquivos: j.arquivos,
      });
      setNovo(false);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  async function salvar() {
    if (!rascunho) return;
    setSalvando(true);
    const { perfil, metricas, posts, analise, arquivos, ...resto } = rascunho;
    const r = await fetch("/api/metricas", {
      method: "POST",
      body: JSON.stringify({ ...resto, arquivos, relatorio: { perfil, metricas, posts, analise } }),
    });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) return setErro(j.erro);
    setRascunho(null);
    setArqAtual([]);
    setArqAnterior([]);
    await carregarLista();
    abrir(j.id);
  }

  async function abrir(id: string) {
    const r = await fetch(`/api/metricas/${id}`);
    const j = await r.json();
    if (!r.ok) return setErro(j.erro);
    const x = j.relatorio;
    setEditando(false);
    setAberto({ id: x.id, token_publico: x.token_publico ?? null, cliente: x.cliente, rede: x.rede, periodo_atual: x.periodo_atual, periodo_anterior: x.periodo_anterior, perfil: x.analise?.perfil ?? null, metricas: x.metricas, posts: x.posts, analise: x.analise });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este relatório?")) return;
    await fetch(`/api/metricas/${id}`, { method: "DELETE" });
    setAberto(null);
    carregarLista();
  }

  const exibido = rascunho ?? aberto;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm text-ink-2">Relatórios de métricas</p>
          <h1 className="text-2xl font-semibold">{exibido ? `${exibido.cliente} · ${exibido.periodo_atual}` : "Métricas"}</h1>
          {exibido && (
            <p className="text-sm text-ink-2">
              {exibido.rede}
              {exibido.perfil ? ` · ${exibido.perfil}` : ""}
              {exibido.periodo_anterior ? ` · comparado com ${exibido.periodo_anterior}` : ""}
            </p>
          )}
        </div>
        {exibido ? (
          <>
            <button className="btn-ghost" onClick={() => { setRascunho(null); setAberto(null); }}>← Voltar</button>
            <button className="btn-ghost" onClick={() => exportarXlsx(exibido)}>Baixar planilha (.xlsx)</button>
            {rascunho && <button className="btn-ghost" onClick={gerarAnaliseAutomatica} title="Escreve o resumo, o que melhorou e o que piorou a partir dos números">Análise automática</button>}
            {rascunho && <button className="btn-primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar relatório"}</button>}
            {aberto && !editando && <button className="btn-ghost" onClick={() => setEditando(true)}>Editar textos</button>}
            {aberto && editando && <button className="btn-primary" onClick={salvarEdicao} disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</button>}
            {aberto && !editando && <button className="btn-ghost text-[#b42318]" onClick={() => excluir(aberto.id)}>Excluir</button>}
          </>
        ) : (
          <button className="btn-primary" onClick={() => setNovo((v) => !v)}>{novo ? "Cancelar" : "+ Novo relatório"}</button>
        )}
      </header>

      {erro && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}

      {exibido ? (
        <>
          {aberto && (
            <section className="card mb-5 flex flex-wrap items-center gap-3 p-4">
              <div className="mr-auto">
                <h2 className="text-sm font-semibold">Versão para o cliente</h2>
                <p className="text-xs text-ink-2">Página com a identidade da NUV: destaques, resumo, o que funcionou, pontos de atenção e próximos passos.</p>
              </div>
              {aberto.token_publico ? (
                <>
                  <input className="input w-full text-xs sm:w-80" readOnly value={linkPublico} onFocus={(e) => e.target.select()} aria-label="Link do relatório" />
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(linkPublico);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 1500);
                    }}
                  >
                    {copiado ? "Copiado!" : "Copiar link"}
                  </button>
                  <a className="btn-ghost" href={linkPublico} target="_blank" rel="noreferrer">Abrir</a>
                  <button className="text-xs text-ink-2 hover:text-[#b42318]" onClick={despublicar}>Desativar link</button>
                </>
              ) : (
                <button className="btn-primary" onClick={publicar}>Gerar link para o cliente</button>
              )}
              <a className="btn-ghost" href={`/api/metricas/${aberto.id}?formato=html`}>Baixar HTML</a>
            </section>
          )}
          {rascunho && (
            <p className="mb-4 rounded-xl bg-nuv-soft p-3 text-sm text-nuv">
              Confira e complete os números e os textos. Depois clique em “Análise automática” se quiser que o painel escreva o resumo,
              e em “Salvar relatório”. Os campos de “Recomendações” são seus: um item por linha.
            </p>
          )}
          <RelatorioView
            key={versao}
            dados={exibido}
            editavel={Boolean(rascunho) || editando}
            onChange={(d) => (rascunho ? setRascunho({ ...rascunho, ...d }) : aberto && setAberto({ ...aberto, ...d }))}
          />
        </>
      ) : (
        <>
          {novo && (
            <form onSubmit={(e) => (modo === "ia" ? gerar(e) : e.preventDefault())} className="card mb-6 space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="label" htmlFor="cli">Cliente</label>
                  <input id="cli" className="input" list="clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} required />
                  <datalist id="clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="label" htmlFor="rede">Rede</label>
                  <select id="rede" className="input" value={rede} onChange={(e) => setRede(e.target.value)}>
                    {REDES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="pa">Período atual</label>
                  <input id="pa" className="input" value={pAtual} onChange={(e) => setPAtual(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="pan">Período anterior</label>
                  <input id="pan" className="input" value={pAnterior} onChange={(e) => setPAnterior(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1 text-sm" role="tablist">
                {([
                  ["claude", "Usar meu Claude (grátis)"],
                  ["manual", "Digitar os números (grátis)"],
                  ...(iaLigada ? [["ia", "Leitura automática (API)"]] : []),
                ] as [typeof modo, string][]).map(([m, r]) => (
                  <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)}
                    className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${modo === m ? "bg-white shadow-sm" : "text-ink-2"}`}>
                    {r}
                  </button>
                ))}
              </div>

              {modo === "claude" && (
                <ol className="space-y-4 text-sm">
                  <li className="rounded-xl border border-black/5 p-4">
                    <p className="font-medium">1. Copie o pedido e abra o Claude</p>
                    <p className="mt-1 text-ink-2">Numa conversa nova, cole o pedido e anexe os prints (ou o PDF) do período. Se tiver prints do mês anterior, diga quais são.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn-primary" onClick={async () => {
                        await navigator.clipboard.writeText(pedidoParaClaude({ cliente, rede, periodoAtual: pAtual, periodoAnterior: pAnterior }));
                        setPedidoCopiado(true);
                        setTimeout(() => setPedidoCopiado(false), 2000);
                      }}>{pedidoCopiado ? "Pedido copiado!" : "Copiar pedido"}</button>
                      <a className="btn-ghost" href="https://claude.ai/new" target="_blank" rel="noreferrer">Abrir o Claude ↗</a>
                    </div>
                  </li>
                  <li className="rounded-xl border border-black/5 p-4">
                    <p className="font-medium">2. Cole aqui a resposta do Claude</p>
                    <textarea className="input mt-2 min-h-[140px] font-mono text-xs" value={colado} onChange={(e) => setColado(e.target.value)}
                      placeholder="Cole a resposta inteira (o bloco que começa com { )" aria-label="Resposta do Claude" />
                    <button type="button" className="btn-primary mt-3" disabled={!colado.trim()} onClick={montarDoClaude}>Montar relatório</button>
                  </li>
                </ol>
              )}

              {modo === "manual" && (
                <div className="rounded-xl border border-black/5 p-4 text-sm">
                  <p className="text-ink-2">
                    O painel abre a planilha com as métricas mais usadas no {rede}. Você preenche o mês atual e o anterior olhando o painel
                    profissional, e o painel calcula as variações e escreve uma análise básica.
                  </p>
                  <button type="button" className="btn-primary mt-3" onClick={montarManual}>Abrir planilha para preencher</button>
                </div>
              )}

              {modo === "ia" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Dropzone titulo="Prints / PDF do período atual" ajuda="Arraste aqui ou clique. Painel profissional, insights dos posts, PDF do Meta." arquivos={arqAtual} setArquivos={setArqAtual} />
                    <Dropzone titulo="Prints / PDF do período anterior (opcional)" ajuda="Para comparar. Se o print já mostra a comparação, pode deixar vazio." arquivos={arqAnterior} setArquivos={setArqAnterior} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn-primary" disabled={processando || !arqAtual.length}>
                      {processando ? "Lendo os arquivos..." : "Gerar relatório"}
                    </button>
                    {processando && <span className="text-sm text-ink-2">O Claude está lendo os prints e montando a planilha. Leva cerca de 1 minuto.</span>}
                  </div>
                </>
              )}
            </form>
          )}

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
              <h2 className="mr-auto text-sm font-semibold">Relatórios salvos</h2>
              <select className="input w-auto py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por cliente">
                <option value="">Todos os clientes</option>
                {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {lista.length === 0 ? (
              <p className="p-5 text-sm text-ink-2">Nenhum relatório ainda. Clique em “Novo relatório” para montar o do mês.</p>
            ) : (
              <ul>
                {lista.map((r) => (
                  <li key={r.id} className="border-t border-black/5 first:border-t-0">
                    <button onClick={() => abrir(r.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface">
                      <span className="font-medium">{r.cliente}</span>
                      <span className="text-sm text-ink-2">{r.rede} · {r.periodo_atual}{r.periodo_anterior ? ` vs ${r.periodo_anterior}` : ""}</span>
                      <span className="ml-auto text-xs text-ink-3">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
