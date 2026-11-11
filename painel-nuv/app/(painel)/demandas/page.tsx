"use client";
import { Hammer, Pause, Pencil, Play, Repeat, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { tom } from "@/lib/cores";
import { DIAS_SEMANA, dataBR } from "@/lib/format";

type Demanda = {
  id: string;
  titulo: string;
  cliente: string | null;
  data: string | null;
  dataFim: string | null;
  prioridade: string | null;
  duracao: string | null;
  prazoReal: string | null;
  responsavel: string | null;
  status: string;
  concluida: boolean;
  url: string;
  recorrente?: boolean;
};
type Dados = {
  demandas: Demanda[];
  opcoes: { clientes: string[]; prioridades: string[]; duracoes: string[]; status: string[] };
  concluido: string;
  inicial: string;
  andamento: string[];
  cores: Record<string, string>;
  hoje: string;
  notionUrl: string;
  recorrentes: Regra[];
  pessoas: { id: string; nome: string; foto: string | null }[];
  eu: string;
  temResponsavel: boolean;
};
type Frequencia = "diaria" | "dias_uteis" | "semanal" | "quinzenal" | "mensal";
type Regra = {
  id: string;
  titulo: string;
  cliente: string | null;
  prioridade: string | null;
  duracao: string | null;
  frequencia: Frequencia;
  data_inicio: string;
  ativo: boolean;
  proxima: string | null;
  responsavel?: string | null;
};

const FREQ: Record<Frequencia, string> = {
  diaria: "Todo dia",
  dias_uteis: "Dias úteis (seg a sex)",
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
};

const SEM_CLIENTE = "Sem cliente";
const CORES_PRIO: Record<string, string> = {
  alta: "bg-[#fdecea] text-[#a1261f]",
  média: "bg-[#fdf3dc] text-[#8a5a00]",
  media: "bg-[#fdf3dc] text-[#8a5a00]",
  baixa: "bg-surface-2 text-ink-2",
};

/** último dia da demanda (igual ao início quando é de um dia só) */
const fimDe = (x: Pick<Demanda, "data" | "dataFim">) => x.dataFim ?? x.data;
const curto = (iso: string) => dataBR(iso).slice(0, 5);
/** "Hoje", "11/11" ou "11/11 → 12/11" */
function rotuloData(x: Pick<Demanda, "data" | "dataFim">, hoje: string) {
  if (!x.data) return "";
  if (!x.dataFim || x.dataFim === x.data) return x.data === hoje ? "Hoje" : curto(x.data);
  return `${curto(x.data)} → ${x.dataFim === hoje ? "hoje" : curto(x.dataFim)}`;
}

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function segundaDa(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return somaDias(iso, -((d.getUTCDay() + 6) % 7));
}

export default function Demandas() {
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [visao, setVisao] = useState<"clientes" | "semana">("clientes");
  const [filtro, setFiltro] = useState("");
  const [pessoa, setPessoa] = useState(""); // "" = todos, "__minhas" = só as minhas, ou um nome
  const [verConcluidas, setVerConcluidas] = useState(false);
  const [novo, setNovo] = useState(false);
  const [semana, setSemana] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [verRegras, setVerRegras] = useState(false);
  const [editandoRegra, setEditandoRegra] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const r = await fetch("/api/demandas");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro ao ler o Notion");
    setD(j);
    setSemana((s) => s ?? segundaDa(j.hoje));
  }, []);
  useEffect(() => {
    // primeiro mostra o que já existe; em seguida cria as próximas repetições e recarrega se surgiu algo
    carregar().then(async () => {
      const r = await fetch("/api/demandas", { method: "POST", body: JSON.stringify({ acao: "gerar" }) }).catch(() => null);
      const j = r && r.ok ? await r.json() : null;
      if (j?.criadas) {
        setAviso(`${j.criadas} demanda${j.criadas > 1 ? "s" : ""} que se repete${j.criadas > 1 ? "m" : ""} ${j.criadas > 1 ? "foram criadas" : "foi criada"} no Notion.`);
        carregar();
      }
    });
  }, [carregar]);

  async function acaoRegra(corpo: unknown, sucesso?: string) {
    setErro("");
    const r = await fetch("/api/demandas", { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro ao salvar a repetição");
    if (sucesso) setAviso(sucesso + (j.criadas ? ` ${j.criadas} card${j.criadas > 1 ? "s" : ""} já ${j.criadas > 1 ? "foram criados" : "foi criado"} no Notion.` : ""));
    await carregar();
  }

  async function enviar(corpo: unknown) {
    setErro("");
    const r = await fetch("/api/demandas", { method: "POST", body: JSON.stringify(corpo) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro ?? "Erro ao gravar no Notion");
    return j.demanda as Demanda;
  }

  /** Atualiza na tela na hora e grava no Notion; se der erro, volta. */
  async function atualizar(dem: Demanda, dados: Partial<Demanda>) {
    if (!d) return;
    const antes = d.demandas;
    const otimista = { ...dem, ...dados } as Demanda;
    if (dados.concluida !== undefined && dados.status === undefined) otimista.status = dados.concluida ? d.concluido : d.inicial;
    setD({ ...d, demandas: antes.map((x) => (x.id === dem.id ? otimista : x)) });
    try {
      const nova = await enviar({ acao: "atualizar", id: dem.id, dados });
      setD((atual) => (atual ? { ...atual, demandas: atual.demandas.map((x) => (x.id === dem.id ? nova : x)) } : atual));
    } catch (e) {
      setErro((e as Error).message);
      setD((atual) => (atual ? { ...atual, demandas: antes } : atual));
    }
  }

  async function criar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const v = (k: string) => (String(f.get(k) ?? "").trim() || null);
    const repete = v("repete") as Frequencia | null;
    if (repete) {
      const form = ev.currentTarget;
      await acaoRegra(
        {
          acao: "criar_recorrente",
          dados: { titulo: v("titulo"), cliente: v("cliente"), prioridade: v("prioridade"), duracao: v("duracao"), responsavel: v("responsavel"), frequencia: repete, data_inicio: v("data") ?? hoje },
        },
        `Pronto: “${v("titulo")}” vai se repetir (${FREQ[repete].toLowerCase()}).`,
      );
      form?.reset();
      setNovo(false);
      return;
    }
    try {
      const nova = await enviar({
        acao: "criar",
        dados: { titulo: v("titulo"), cliente: v("cliente"), data: v("data"), dataFim: v("dataFim"), prioridade: v("prioridade"), duracao: v("duracao"), responsavel: v("responsavel"), status: v("status") ?? undefined },
      });
      setD((atual) => (atual ? { ...atual, demandas: [nova, ...atual.demandas] } : atual));
      ev.currentTarget?.reset();
      setNovo(false);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const hoje = d?.hoje ?? "";
  const lista = useMemo(
    () =>
      (d?.demandas ?? []).filter(
        (x) =>
          (verConcluidas || !x.concluida) &&
          (!filtro || (x.cliente ?? SEM_CLIENTE) === filtro) &&
          (!pessoa || (pessoa === "__minhas" ? x.responsavel?.toLowerCase() === d?.eu.toLowerCase() : pessoa === "__ninguem" ? !x.responsavel : x.responsavel === pessoa)),
      ),
    [d, verConcluidas, filtro, pessoa],
  );
  const abertas = (d?.demandas ?? []).filter((x) => !x.concluida);
  const atrasadas = abertas.filter((x) => x.data && fimDe(x)! < hoje);
  const deHoje = abertas.filter((x) => x.data && x.data <= hoje && fimDe(x)! >= hoje);
  const fazendo = abertas.filter((x) => d?.andamento.includes(x.status));

  const porCliente = useMemo(() => {
    const m = new Map<string, Demanda[]>();
    for (const x of lista) m.set(x.cliente ?? SEM_CLIENTE, [...(m.get(x.cliente ?? SEM_CLIENTE) ?? []), x]);
    return [...m.entries()].sort((a, b) => {
      const atr = (l: Demanda[]) => l.filter((x) => !x.concluida && x.data && fimDe(x)! < hoje).length;
      return atr(b[1]) - atr(a[1]) || b[1].filter((x) => !x.concluida).length - a[1].filter((x) => !x.concluida).length;
    });
  }, [lista, hoje]);

  const cor = (cliente: string | null) => (cliente && d?.cores[cliente.toLowerCase()]) || "#8a8984";

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm text-ink-2">Minha Semana Produtiva · NUV</p>
          <h1 className="titulo-pagina">Demandas</h1>
        </div>
        {d && <a className="btn-ghost" href={d.notionUrl} target="_blank" rel="noreferrer">Abrir no Notion ↗</a>}
        <button className="so-editor btn-primary" onClick={() => setNovo((v) => !v)}>{novo ? "Cancelar" : "+ Nova demanda"}</button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["Em aberto", abertas.length, ""],
          ["Atrasadas", atrasadas.length, atrasadas.length ? "text-[#b42318]" : ""],
          ["Para hoje", deHoje.length, ""],
          ["Fazendo agora", fazendo.length, ""],
        ] as const).map(([r, v, c]) => (
          <div key={r} className={`rounded-[26px] p-5 ${r === "Atrasadas" && v ? "bg-rosa" : r === "Para hoje" ? "bg-lima" : r === "Fazendo agora" ? "bg-amarelo" : "bg-white"}`}>
            <p className="text-xs font-semibold text-ink-2">{r}</p>
            <p className={`tabular mt-1 text-3xl font-bold tracking-tight ${c}`}>{d ? v : "–"}</p>
          </div>
        ))}
      </div>

      {erro && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}
      {aviso && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-lima/60 px-4 py-3 text-sm font-medium">
          {aviso}
          <button className="ml-auto" onClick={() => setAviso("")} aria-label="Fechar aviso">×</button>
        </p>
      )}

      {novo && d && (
        <form onSubmit={criar} className="card mb-4 grid gap-3 p-4 sm:grid-cols-6">
          <input name="titulo" className="input sm:col-span-2" placeholder="O que precisa ser feito" required autoFocus />
          <select name="cliente" className="input" defaultValue={filtro || ""} aria-label="Cliente">
            <option value="">Cliente</option>
            {d.opcoes.clientes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="text-xs font-semibold text-ink-2">Começa
            <input name="data" type="date" className="input mt-0.5" defaultValue={hoje} aria-label="Data de início" />
          </label>
          <label className="text-xs font-semibold text-ink-2">Até (se levar mais de um dia)
            <input name="dataFim" type="date" className="input mt-0.5" aria-label="Último dia" />
          </label>
          <select name="status" className="input self-end" defaultValue={d.inicial} aria-label="Status">
            {d.opcoes.status.filter((c) => c !== d.concluido).map((c) => <option key={c}>{c}</option>)}
          </select>
          <select name="prioridade" className="input" defaultValue="" aria-label="Prioridade">
            <option value="">Prioridade</option>
            {d.opcoes.prioridades.map((c) => <option key={c}>{c}</option>)}
          </select>
          {d.temResponsavel && (
            <select name="responsavel" className="input" defaultValue={d.eu} aria-label="Responsável">
              <option value="">Sem responsável</option>
              {d.pessoas.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          )}
          <select name="duracao" className="input" defaultValue="" aria-label="Duração">
            <option value="">Duração</option>
            {d.opcoes.duracoes.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <Repeat size={15} />
            <select name="repete" className="input" defaultValue="" aria-label="Repetir">
              <option value="">Não repete</option>
              {Object.entries(FREQ).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </label>
          <p className="self-center text-xs text-ink-3 sm:col-span-3">
            Criada direto no Notion. Com “Até”, a demanda aparece em todos os dias do período. Se repetir, a data de início é a primeira vez; as próximas aparecem sozinhas e cada card pode ser editado à parte.
          </p>
          <button className="btn-primary">Criar</button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar cliente">
          <option value="">Todos os clientes</option>
          {[...(d?.opcoes.clientes ?? []), SEM_CLIENTE].map((c) => <option key={c}>{c}</option>)}
        </select>
        {d?.temResponsavel && (
          <select className="input w-auto" value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Filtrar responsável">
            <option value="">Todas as pessoas</option>
            <option value="__minhas">Minhas demandas</option>
            <option value="__ninguem">Sem responsável</option>
            {d.pessoas.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={verConcluidas} onChange={(e) => setVerConcluidas(e.target.checked)} />
          Mostrar concluídas (últimos 14 dias)
        </label>
        <div className="pill-tabs ml-auto">
          {(["clientes", "semana"] as const).map((v) => (
            <button key={v} onClick={() => setVisao(v)} className={`pill-tab ${visao === v ? "pill-tab-ativo" : ""}`}>
              {v === "clientes" ? "Por cliente" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {d && (
        <section className="mb-5 rounded-[26px] bg-white">
          <button onClick={() => setVerRegras((v) => !v)} className="flex w-full items-center gap-2 px-5 py-4 text-left">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lilas"><Repeat size={15} /></span>
            <span className="font-bold">Demandas que se repetem</span>
            <span className="tabular rounded-full bg-surface-2 px-2 text-xs font-semibold">{d.recorrentes.length}</span>
            <span className="ml-auto text-xs font-semibold text-ink-2">{verRegras ? "Fechar" : "Ver e editar"}</span>
          </button>
          {verRegras && (
            <div className="border-t border-black/5 px-5 pb-5 pt-3">
              {d.recorrentes.length === 0 && (
                <p className="text-sm text-ink-2">Nenhuma ainda. Em “+ Nova demanda”, escolha uma opção em “Repetir”.</p>
              )}
              <ul className="space-y-2">
                {d.recorrentes.map((r) =>
                  editandoRegra === r.id ? (
                    <li key={r.id}>
                      <form
                        className="grid gap-2 rounded-[18px] bg-surface p-3 sm:grid-cols-6"
                        onSubmit={async (ev) => {
                          ev.preventDefault();
                          const f = new FormData(ev.currentTarget);
                          const v = (k: string) => (String(f.get(k) ?? "").trim() || null);
                          await acaoRegra(
                            {
                              acao: "atualizar_recorrente",
                              id: r.id,
                              dados: { titulo: v("titulo"), cliente: v("cliente"), prioridade: v("prioridade"), duracao: v("duracao"), responsavel: v("responsavel"), frequencia: v("frequencia"), data_inicio: v("data_inicio") },
                            },
                            "Repetição atualizada. Vale para os próximos cards; os já criados continuam como estão.",
                          );
                          setEditandoRegra(null);
                        }}
                      >
                        <input name="titulo" className="input sm:col-span-2" defaultValue={r.titulo} required aria-label="Título" />
                        <select name="cliente" className="input" defaultValue={r.cliente ?? ""} aria-label="Cliente">
                          <option value="">Cliente</option>
                          {d.opcoes.clientes.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select name="frequencia" className="input" defaultValue={r.frequencia} aria-label="Frequência">
                          {Object.entries(FREQ).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                        </select>
                        <input name="data_inicio" type="date" className="input" defaultValue={r.data_inicio} aria-label="A partir de" title="A partir de" />
                        <select name="prioridade" className="input" defaultValue={r.prioridade ?? ""} aria-label="Prioridade">
                          <option value="">Prioridade</option>
                          {d.opcoes.prioridades.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select name="responsavel" className="input" defaultValue={r.responsavel ?? ""} aria-label="Responsável">
                          <option value="">Sem responsável</option>
                          {d.pessoas.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                        <select name="duracao" className="input" defaultValue={r.duracao ?? ""} aria-label="Duração">
                          <option value="">Duração</option>
                          {d.opcoes.duracoes.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-2 sm:col-span-4 sm:justify-end">
                          <button type="button" className="btn-ghost" onClick={() => setEditandoRegra(null)}>Cancelar</button>
                          <button className="btn-primary">Salvar</button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={r.id} className={`flex flex-wrap items-center gap-2 rounded-[18px] bg-surface px-3 py-2.5 ${r.ativo ? "" : "opacity-60"}`}>
                      <Repeat size={14} className="text-ink-2" />
                      <span className="font-semibold">{r.titulo}</span>
                      {r.cliente && (
                        <span className="chip" style={{ background: tom(cor(r.cliente)) }}>{r.cliente}</span>
                      )}
                      <span className="chip bg-white text-ink-2">{FREQ[r.frequencia]}</span>
                      <span className="text-xs text-ink-2">
                        {r.ativo ? (r.proxima ? `próxima: ${dataBR(r.proxima).slice(0, 5)}` : "") : "pausada"}
                      </span>
                      <span className="so-editor ml-auto flex gap-1">
                        <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" title="Editar" aria-label="Editar" onClick={() => setEditandoRegra(r.id)}><Pencil size={14} /></button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"
                          title={r.ativo ? "Pausar" : "Retomar"}
                          aria-label={r.ativo ? "Pausar" : "Retomar"}
                          onClick={() => acaoRegra({ acao: "atualizar_recorrente", id: r.id, dados: { ativo: !r.ativo } }, r.ativo ? "Repetição pausada." : "Repetição retomada.")}
                        >
                          {r.ativo ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full text-[#b42318] hover:bg-white"
                          title="Excluir"
                          aria-label="Excluir"
                          onClick={() =>
                            confirm(`Parar de repetir “${r.titulo}”? Os cards já criados no Notion continuam lá.`) &&
                            acaoRegra({ acao: "excluir_recorrente", id: r.id }, "Repetição excluída. Os cards já criados continuam no Notion.")
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </section>
      )}

      {!d && !erro && <p className="text-sm text-ink-2">Lendo as demandas do Notion...</p>}

      {d && visao === "clientes" && (
        porCliente.length === 0 ? (
          <p className="card p-6 text-sm text-ink-2">Nenhuma demanda em aberto. 🎉</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {porCliente.map(([cliente, itens]) => {
              const abertasCli = itens.filter((x) => !x.concluida);
              const atrasCli = abertasCli.filter((x) => x.data && fimDe(x)! < hoje).length;
              return (
                <section key={cliente} className="flex flex-col rounded-[26px] p-4" style={{ background: tom(cor(cliente === SEM_CLIENTE ? null : cliente), 0.78) }}>
                  <header className="mb-3 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: cor(cliente === SEM_CLIENTE ? null : cliente) }} />
                    <h2 className="text-lg font-bold">{cliente}</h2>
                    <span className="tabular ml-auto text-xs text-ink-2">
                      {abertasCli.length} em aberto{atrasCli ? <b className="text-[#b42318]"> · {atrasCli} atrasada{atrasCli > 1 ? "s" : ""}</b> : null}
                    </span>
                  </header>
                  <ul className="space-y-1.5">
                    {itens.map((x) => (
                      <Item key={x.id} x={x} hoje={hoje} dados={d} aberta={aberta === x.id} onAbrir={() => setAberta(aberta === x.id ? null : x.id)} onAtualizar={atualizar} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )
      )}

      {d && visao === "semana" && semana && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button className="btn-ghost px-3" onClick={() => setSemana(somaDias(semana, -7))} aria-label="Semana anterior">‹</button>
            <button className="btn-ghost" onClick={() => setSemana(segundaDa(hoje))}>Esta semana</button>
            <button className="btn-ghost px-3" onClick={() => setSemana(somaDias(semana, 7))} aria-label="Próxima semana">›</button>
            <span className="text-sm text-ink-2">{dataBR(semana).slice(0, 5)} a {dataBR(somaDias(semana, 6)).slice(0, 5)}</span>
          </div>
          {semana === segundaDa(hoje) && atrasadas.length > 0 && (
            <section className="mb-4 rounded-2xl border border-[#f3c4c0] bg-[#fdecea] p-4">
              <h2 className="mb-2 text-sm font-semibold text-[#a1261f]">Atrasadas</h2>
              <ul className="grid gap-1.5 md:grid-cols-2">
                {atrasadas.filter((x) => !filtro || (x.cliente ?? SEM_CLIENTE) === filtro).map((x) => (
                  <Item key={x.id} x={x} hoje={hoje} dados={d} mostrarCliente aberta={aberta === x.id} onAbrir={() => setAberta(aberta === x.id ? null : x.id)} onAtualizar={atualizar} />
                ))}
              </ul>
            </section>
          )}
          <div className="grid gap-3 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => somaDias(semana, i)).map((dia, i) => {
              // demanda de vários dias aparece em cada dia do período
              const doDia = lista.filter((x) => x.data && x.data <= dia && fimDe(x)! >= dia);
              return (
                <section key={dia} className={`min-h-[160px] rounded-[26px] p-3 ${dia === hoje ? "bg-white ring-2 ring-ink" : "bg-white/60"}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-2">{DIAS_SEMANA[i]}</p>
                  <p className={`tabular text-sm font-semibold ${dia === hoje ? "text-nuv" : ""}`}>{dataBR(dia).slice(0, 5)}</p>
                  <ul className="mt-2 space-y-1.5">
                    {doDia.map((x) => (
                      <Item key={x.id} x={x} hoje={hoje} dados={d} compacto mostrarCliente aberta={aberta === x.id} onAbrir={() => setAberta(aberta === x.id ? null : x.id)} onAtualizar={atualizar} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {lista.some((x) => !x.data && !x.concluida) && (
            <section className="card mt-4 p-4">
              <h2 className="mb-2 text-sm font-semibold">Sem data</h2>
              <ul className="grid gap-1.5 md:grid-cols-2">
                {lista.filter((x) => !x.data && !x.concluida).map((x) => (
                  <Item key={x.id} x={x} hoje={hoje} dados={d} mostrarCliente aberta={aberta === x.id} onAbrir={() => setAberta(aberta === x.id ? null : x.id)} onAtualizar={atualizar} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Item({ x, hoje, dados, aberta, onAbrir, onAtualizar, compacto, mostrarCliente }: {
  x: Demanda; hoje: string; dados: Dados; aberta: boolean; onAbrir: () => void;
  onAtualizar: (x: Demanda, d: Partial<Demanda>) => void; compacto?: boolean; mostrarCliente?: boolean;
}) {
  const atrasada = !x.concluida && x.data && fimDe(x)! < hoje;
  const fazendo = !x.concluida && dados.andamento.includes(x.status);
  const varios = Boolean(x.data && x.dataFim && x.dataFim > x.data);
  const corCli = (x.cliente && dados.cores[x.cliente.toLowerCase()]) || "#8a8984";
  const resp = x.responsavel ? dados.pessoas.find((p) => p.nome === x.responsavel) : null;
  return (
    <li className={`rounded-[18px] bg-white/80 ${x.concluida ? "opacity-60" : ""} ${fazendo ? "ring-2 ring-azul" : ""}`}>
      <div className="flex items-start gap-2 p-2">
        <input
          type="checkbox"
          className="so-editor mt-0.5 h-4 w-4 shrink-0 accent-[#1f3fd1]"
          checked={x.concluida}
          onChange={(e) => onAtualizar(x, { concluida: e.target.checked })}
          aria-label={`Concluir ${x.titulo}`}
        />
        <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
          <p className={`text-sm leading-snug ${x.concluida ? "line-through" : "font-medium"} ${compacto ? "line-clamp-3" : ""}`}>
            {x.recorrente && <Repeat size={12} className="mr-1 inline -translate-y-px text-ink-2" aria-label="Se repete" />}
            {x.titulo}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {x.responsavel && (
              <span className="chip bg-white pl-0.5 text-ink-2">
                <Avatar nome={x.responsavel} foto={resp?.foto} tamanho={16} />
                {compacto ? "" : x.responsavel.split(" ")[0]}
              </span>
            )}
            {mostrarCliente && x.cliente && (
              <span className="chip bg-white text-ink-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: corCli }} />{x.cliente}</span>
            )}
            {x.data && (!compacto || varios) && (
              <span className={`chip ${atrasada ? "bg-[#fdecea] text-[#a1261f]" : x.data <= hoje && fimDe(x)! >= hoje ? "bg-nuv-soft text-nuv" : "bg-white text-ink-2"}`}>
                {atrasada ? "⚠ " : ""}{compacto ? `até ${curto(fimDe(x)!)}` : rotuloData(x, hoje)}
              </span>
            )}
            {x.prioridade && <span className={`chip ${CORES_PRIO[x.prioridade.toLowerCase()] ?? "bg-white text-ink-2"}`}>{x.prioridade}</span>}
            {x.duracao && !compacto && <span className="chip bg-white text-ink-3">{x.duracao}</span>}
            {x.status !== dados.inicial && !x.concluida && (
              <span className={`chip ${fazendo ? "bg-azul text-white" : "bg-white text-ink-2"}`} title={x.status}>{fazendo && <Hammer size={10} />}{compacto && fazendo ? "fazendo" : x.status}</span>
            )}
          </div>
        </button>
        {!compacto && !x.concluida && x.status === dados.inicial && dados.andamento[0] && (
          <button
            className="so-editor grid h-7 w-7 shrink-0 place-items-center rounded-full bg-azul-claro text-azul hover:bg-azul hover:text-white"
            title={`Marcar como “${dados.andamento[0]}”`}
            aria-label={`Começar ${x.titulo}`}
            onClick={() => onAtualizar(x, { status: dados.andamento[0], concluida: false })}
          >
            <Play size={12} />
          </button>
        )}
      </div>
      {aberta && (
        <div className="grid gap-2 border-t border-black/5 p-2 sm:grid-cols-2 [.somente-leitura_&>label]:hidden">
          <label className="text-xs text-ink-2">Começa
            <input
              type="date"
              className="input mt-0.5 py-1 text-xs"
              defaultValue={x.data ?? ""}
              key={`i${x.data}`}
              onChange={(e) => {
                const ini = e.target.value || null;
                // se o novo início passar do fim, vira demanda de um dia só
                onAtualizar(x, { data: ini, dataFim: ini && x.dataFim && x.dataFim > ini ? x.dataFim : null });
              }}
            />
          </label>
          <label className="text-xs text-ink-2">Até
            <input
              type="date"
              className="input mt-0.5 py-1 text-xs"
              min={x.data ?? undefined}
              disabled={!x.data}
              defaultValue={x.dataFim ?? ""}
              key={`f${x.dataFim}`}
              onChange={(e) => onAtualizar(x, { data: x.data, dataFim: e.target.value && x.data && e.target.value > x.data ? e.target.value : null })}
            />
          </label>
          <label className="text-xs text-ink-2">Cliente
            <select className="input mt-0.5 py-1 text-xs" value={x.cliente ?? ""} onChange={(e) => onAtualizar(x, { cliente: e.target.value || null })}>
              <option value="">—</option>
              {dados.opcoes.clientes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          {dados.temResponsavel && (
            <label className="text-xs text-ink-2">Responsável
              <select className="input mt-0.5 py-1 text-xs" value={x.responsavel ?? ""} onChange={(e) => onAtualizar(x, { responsavel: e.target.value || null })}>
                <option value="">Sem responsável</option>
                {dados.pessoas.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                {x.responsavel && !dados.pessoas.some((p) => p.nome === x.responsavel) && <option value={x.responsavel}>{x.responsavel}</option>}
              </select>
            </label>
          )}
          <label className="text-xs text-ink-2">Prioridade
            <select className="input mt-0.5 py-1 text-xs" value={x.prioridade ?? ""} onChange={(e) => onAtualizar(x, { prioridade: e.target.value || null })}>
              <option value="">—</option>
              {dados.opcoes.prioridades.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs text-ink-2">Status
            <select className="input mt-0.5 py-1 text-xs" value={x.status} onChange={(e) => onAtualizar(x, { status: e.target.value, concluida: e.target.value === dados.concluido })}>
              {dados.opcoes.status.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          {x.prazoReal && <p className="text-xs text-ink-2 sm:col-span-2">Prazo real: {x.prazoReal}</p>}
          <a className="text-xs font-medium text-nuv hover:underline sm:col-span-2" href={x.url} target="_blank" rel="noreferrer">Abrir no Notion ↗</a>
        </div>
      )}
    </li>
  );
}
