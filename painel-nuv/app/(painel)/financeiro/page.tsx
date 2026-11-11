"use client";
import { useCallback, useEffect, useState } from "react";
import { GraficoMeses } from "@/components/GraficoMeses";
import { brl, dataBR, hojeISO, rotuloMes, somaMes } from "@/lib/format";

type Tipo = "entrada" | "saida";
type Lancamento = {
  id: string; tipo: Tipo; descricao: string; valor: number; data: string; categoria: string;
  cliente_id: string | null; forma_pagamento: string | null; pago: boolean; origem: string; observacao: string | null;
};
type Cliente = { id: string; nome: string; mensalidade: number; dia_vencimento: number; ativo: boolean };
type Recorrente = { id: string; tipo: Tipo; descricao: string; valor: number; categoria: string; dia: number; cliente_id: string | null; ativo: boolean };
type Dados = {
  mes: string; hoje: string; clientes: Cliente[]; recorrentes: Recorrente[]; lancamentos: Lancamento[];
  resumo: { entradas: number; saidas: number; lucro: number; margem: number | null; recebido: number; aReceber: number; pago: number; aPagar: number; atrasados: Lancamento[] };
  historico: { mes: string; entradas: number; saidas: number; lucro: number }[];
  porCliente: { id: string; nome: string; receita: number; custo: number }[];
  categorias: { entrada: string[]; saida: string[] };
};

const FORMAS = ["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro"];

async function acao(corpo: unknown) {
  const r = await fetch("/api/financeiro", { method: "POST", body: JSON.stringify(corpo) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro ?? "Erro");
}

function Tile({ rotulo, valor, detalhe, destaque, fundo }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean; fundo?: string }) {
  return (
    <div className={`rounded-[26px] p-5 ${fundo ?? (destaque ? "bg-lima" : "bg-white")}`}>
      <p className="text-xs font-semibold text-ink-2">{rotulo}</p>
      <p className="tabular mt-1 text-2xl font-bold tracking-tight">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-ink-2">{detalhe}</p>}
    </div>
  );
}

export default function Financeiro() {
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | Tipo | "pendentes">("todos");
  const [form, setForm] = useState<Tipo | null>(null);
  const [aba, setAba] = useState<"lancamentos" | "config">("lancamentos");

  const carregar = useCallback(async () => {
    setErro("");
    const r = await fetch(`/api/financeiro?mes=${mes}`);
    const j = await r.json();
    if (!r.ok) {
      setErro(j.erro ?? "Erro ao carregar");
      setD(null);
    } else setD(j);
  }, [mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(corpo: unknown) {
    try {
      await acao(corpo);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const nomeCliente = (id: string | null) => d?.clientes.find((c) => c.id === id)?.nome;
  const lista = (d?.lancamentos ?? []).filter((l) =>
    filtro === "todos" ? true : filtro === "pendentes" ? !l.pago : l.tipo === filtro,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm text-ink-2">Financeiro da agência</p>
          <h1 className="titulo-pagina">{rotuloMes(mes)}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-3" onClick={() => setMes(somaMes(mes, -1))} aria-label="Mês anterior">‹</button>
          <button className="btn-ghost" onClick={() => setMes(hojeISO().slice(0, 7))}>Este mês</button>
          <button className="btn-ghost px-3" onClick={() => setMes(somaMes(mes, 1))} aria-label="Próximo mês">›</button>
        </div>
      </header>

      {erro && <p className="mb-4 rounded-xl bg-[#fdecea] p-3 text-sm text-[#a1261f]">{erro}</p>}
      {!d && !erro && <p className="text-sm text-ink-2">Carregando...</p>}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile fundo="bg-lilas" rotulo="Entradas" valor={brl(d.resumo.entradas)} detalhe={`${brl(d.resumo.recebido)} recebido`} />
            <Tile fundo="bg-rosa" rotulo="Saídas" valor={brl(d.resumo.saidas)} detalhe={`${brl(d.resumo.pago)} pago`} />
            <Tile rotulo="Lucro do mês" valor={brl(d.resumo.lucro)} detalhe={d.resumo.margem === null ? "sem entradas" : `margem de ${(d.resumo.margem * 100).toFixed(0)}%`} destaque />
            <Tile rotulo="A receber" valor={brl(d.resumo.aReceber)} />
            <Tile rotulo="A pagar" valor={brl(d.resumo.aPagar)} />
          </div>

          {d.resumo.atrasados.length > 0 && (
            <section className="mt-4 rounded-2xl border border-[#f5d48a] bg-[#fdf6e3] p-4">
              <h2 className="text-sm font-semibold text-[#8a5a00]">⚠ {d.resumo.atrasados.length} lançamento(s) vencido(s) sem baixa</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {d.resumo.atrasados.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-ink-2">{dataBR(l.data)}</span>
                    <span>{l.tipo === "entrada" ? "Receber" : "Pagar"}: {l.descricao}</span>
                    <span className="tabular font-medium">{brl(l.valor)}</span>
                    <button className="ml-auto text-xs font-medium text-nuv hover:underline" onClick={() => executar({ acao: "editar_lancamento", id: l.id, dados: { pago: true } })}>
                      Marcar como {l.tipo === "entrada" ? "recebido" : "pago"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold">Últimos 6 meses</h2>
              <GraficoMeses dados={d.historico} />
              <details className="mt-2 text-xs text-ink-2">
                <summary className="cursor-pointer">Ver em tabela</summary>
                <table className="mt-2 w-full">
                  <tbody>
                    {d.historico.map((h) => (
                      <tr key={h.mes} className="border-t border-black/5">
                        <td className="py-1">{rotuloMes(h.mes)}</td>
                        <td className="tabular text-right">{brl(h.entradas)}</td>
                        <td className="tabular text-right">{brl(h.saidas)}</td>
                        <td className="tabular text-right font-medium text-ink">{brl(h.lucro)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold">Por cliente neste mês</h2>
              {d.porCliente.length === 0 ? (
                <p className="text-sm text-ink-2">Sem lançamentos ligados a clientes.</p>
              ) : (
                <ul className="space-y-3">
                  {d.porCliente.map((c) => {
                    const maxR = Math.max(...d.porCliente.map((x) => x.receita), 1);
                    return (
                      <li key={c.id}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{c.nome}</span>
                          <span className="tabular">{brl(c.receita)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                          <div className="h-1.5 rounded-full bg-azul" style={{ width: `${(c.receita / maxR) * 100}%` }} />
                        </div>
                        {c.custo > 0 && <p className="mt-0.5 text-xs text-ink-2">Custos ligados: {brl(c.custo)} · sobra {brl(c.receita - c.custo)}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="pill-tabs mt-6">
            {(["lancamentos", "config"] as const).map((a) => (
              <button key={a} onClick={() => setAba(a)} className={`pill-tab ${aba === a ? "pill-tab-ativo" : ""}`}>
                {a === "lancamentos" ? "Lançamentos" : "Mensalidades e contas fixas"}
              </button>
            ))}
          </div>

          {aba === "lancamentos" ? (
            <section className="mt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {(["todos", "entrada", "saida", "pendentes"] as const).map((f) => (
                  <button key={f} onClick={() => setFiltro(f)} className={`chip px-3 py-1 text-xs ${filtro === f ? "bg-ink text-white" : "bg-white text-ink-2 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"}`}>
                    {{ todos: "Todos", entrada: "Entradas", saida: "Saídas", pendentes: "Pendentes" }[f]}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <button className="btn-ghost" onClick={() => setForm("entrada")}>+ Entrada</button>
                  <button className="btn-ghost" onClick={() => setForm("saida")}>+ Saída</button>
                </div>
              </div>

              {form && (
                <FormLancamento
                  tipo={form}
                  mes={mes}
                  clientes={d.clientes}
                  categorias={d.categorias[form]}
                  onCancelar={() => setForm(null)}
                  onSalvar={async (dados) => {
                    await executar({ acao: "criar_lancamento", dados });
                    setForm(null);
                  }}
                />
              )}

              <div className="card overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-surface text-left text-xs text-ink-2">
                    <tr>
                      <th className="px-4 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Descrição</th>
                      <th className="px-3 py-2 font-medium">Categoria</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                      <th className="px-3 py-2 text-center font-medium">Pago</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lista.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-2">Nenhum lançamento aqui.</td></tr>
                    )}
                    {lista.map((l) => {
                      const atrasado = !l.pago && l.data < d.hoje;
                      return (
                        <tr key={l.id} className="border-t border-black/5">
                          <td className={`tabular px-4 py-2 ${atrasado ? "font-medium text-[#b42318]" : "text-ink-2"}`}>{dataBR(l.data).slice(0, 5)}{atrasado ? " ⚠" : ""}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium">{l.descricao}</p>
                            <p className="text-xs text-ink-3">
                              {[nomeCliente(l.cliente_id), l.forma_pagamento, l.origem === "mensalidade" ? "mensalidade automática" : l.origem === "recorrente" ? "conta fixa" : l.origem === "servico" ? "serviço freela" : null].filter(Boolean).join(" · ")}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-ink-2">{l.categoria}</td>
                          <td className="tabular px-3 py-2 text-right font-medium">
                            <span className="text-ink-2">{l.tipo === "entrada" ? "+" : "−"} </span>{brl(l.valor)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={l.pago} onChange={(e) => executar({ acao: "editar_lancamento", id: l.id, dados: { pago: e.target.checked } })} aria-label="Pago" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button className="text-xs text-ink-3 hover:text-[#b42318]" onClick={() => confirm(`Excluir "${l.descricao}"?`) && executar({ acao: "excluir_lancamento", id: l.id })}>Excluir</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <Configuracoes d={d} mes={mes} executar={executar} />
          )}
        </>
      )}
    </div>
  );
}

function FormLancamento({ tipo, mes, clientes, categorias, onCancelar, onSalvar }: {
  tipo: Tipo; mes: string; clientes: Cliente[]; categorias: string[]; onCancelar: () => void; onSalvar: (d: unknown) => Promise<void>;
}) {
  const hoje = hojeISO();
  const [f, setF] = useState({
    descricao: "", valor: "", data: hoje.startsWith(mes) ? hoje : `${mes}-01`, categoria: categorias[0],
    cliente_id: "", forma_pagamento: "Pix", pago: false,
  });
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="card mb-3 grid gap-3 p-4 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar({ ...f, tipo, valor: Number(f.valor.replace(/\./g, "").replace(",", ".")), cliente_id: f.cliente_id || null });
      }}
    >
      <div className="sm:col-span-2">
        <label className="label">{tipo === "entrada" ? "Nova entrada" : "Nova saída"}</label>
        <input className="input" placeholder="Descrição" value={f.descricao} onChange={(e) => set("descricao", e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Valor (R$)</label>
        <input className="input tabular" inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => set("valor", e.target.value)} required />
      </div>
      <div>
        <label className="label">Data</label>
        <input className="input" type="date" value={f.data} onChange={(e) => set("data", e.target.value)} required />
      </div>
      <div>
        <label className="label">Categoria</label>
        <select className="input" value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Cliente</label>
        <select className="input" value={f.cliente_id} onChange={(e) => set("cliente_id", e.target.value)}>
          <option value="">—</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Forma</label>
        <select className="input" value={f.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)}>
          {FORMAS.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={f.pago} onChange={(e) => set("pago", e.target.checked)} />
        Já {tipo === "entrada" ? "recebido" : "pago"}
      </label>
      <div className="flex gap-2 self-end sm:col-span-4 sm:justify-end">
        <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}

function Configuracoes({ d, mes, executar }: { d: Dados; mes: string; executar: (c: unknown) => Promise<void> }) {
  const [novoCliente, setNovoCliente] = useState("");
  const [rec, setRec] = useState({ tipo: "saida" as Tipo, descricao: "", valor: "", categoria: "Ferramentas", dia: "5", cliente_id: "" });
  const numero = (s: string) => Number(String(s).replace(/\./g, "").replace(",", "."));
  const mensalTotal = d.clientes.filter((c) => c.ativo).reduce((t, c) => t + c.mensalidade, 0);
  const fixoSaida = d.recorrentes.filter((r) => r.ativo && r.tipo === "saida").reduce((t, r) => t + r.valor, 0);

  return (
    <div className="mt-4 space-y-5">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <p className="text-sm">
          Receita recorrente: <b className="tabular">{brl(mensalTotal)}</b> · Custos fixos: <b className="tabular">{brl(fixoSaida)}</b> · Sobra fixa: <b className="tabular">{brl(mensalTotal - fixoSaida)}</b>
        </p>
        <button className="btn-primary ml-auto" onClick={() => executar({ acao: "gerar_mes", mes })}>
          Gerar lançamentos de {rotuloMes(mes)}
        </button>
        <p className="w-full text-xs text-ink-2">O mês atual é gerado sozinho ao abrir. Para outros meses use o botão. Nada é duplicado se você clicar de novo.</p>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-black/5 px-4 py-3 text-sm font-semibold">Mensalidades dos clientes</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface text-left text-xs text-ink-2">
            <tr><th className="px-4 py-2 font-medium">Cliente</th><th className="px-3 py-2 font-medium">Mensalidade (R$)</th><th className="px-3 py-2 font-medium">Vence dia</th><th className="px-3 py-2 font-medium">Ativo</th></tr>
          </thead>
          <tbody>
            {d.clientes.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="px-4 py-2 font-medium">{c.nome}</td>
                <td className="px-3 py-2">
                  <input className="input tabular w-32 py-1" defaultValue={String(c.mensalidade).replace(".", ",")} inputMode="decimal"
                    onBlur={(e) => numero(e.target.value) !== c.mensalidade && executar({ acao: "salvar_cliente", dados: { ...c, mensalidade: numero(e.target.value) } })} />
                </td>
                <td className="px-3 py-2">
                  <input className="input tabular w-20 py-1" type="number" min={1} max={28} defaultValue={c.dia_vencimento}
                    onBlur={(e) => Number(e.target.value) !== c.dia_vencimento && executar({ acao: "salvar_cliente", dados: { ...c, dia_vencimento: Number(e.target.value) } })} />
                </td>
                <td className="px-3 py-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={c.ativo} onChange={(e) => executar({ acao: "salvar_cliente", dados: { ...c, ativo: e.target.checked } })} aria-label={`${c.nome} ativo`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="flex gap-2 border-t border-black/5 p-3" onSubmit={(e) => { e.preventDefault(); executar({ acao: "salvar_cliente", dados: { nome: novoCliente, mensalidade: 0, dia_vencimento: 10, ativo: true } }); setNovoCliente(""); }}>
          <input className="input" placeholder="Novo cliente" value={novoCliente} onChange={(e) => setNovoCliente(e.target.value)} required />
          <button className="btn-ghost">Adicionar</button>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-black/5 px-4 py-3 text-sm font-semibold">Contas fixas (todo mês)</h2>
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-surface text-left text-xs text-ink-2">
            <tr><th className="px-4 py-2 font-medium">Descrição</th><th className="px-3 py-2 font-medium">Tipo</th><th className="px-3 py-2 font-medium">Categoria</th><th className="px-3 py-2 text-right font-medium">Valor</th><th className="px-3 py-2 font-medium">Dia</th><th className="px-3 py-2 font-medium">Ativa</th><th /></tr>
          </thead>
          <tbody>
            {d.recorrentes.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-ink-2">Cadastre ferramentas (Canva, Adobe, Notion...), freelas fixos, contador, impostos.</td></tr>}
            {d.recorrentes.map((r) => (
              <tr key={r.id} className="border-t border-black/5">
                <td className="px-4 py-2 font-medium">{r.descricao}</td>
                <td className="px-3 py-2 text-ink-2">{r.tipo === "entrada" ? "Entrada" : "Saída"}</td>
                <td className="px-3 py-2 text-ink-2">{r.categoria}</td>
                <td className="tabular px-3 py-2 text-right">{brl(r.valor)}</td>
                <td className="tabular px-3 py-2">{r.dia}</td>
                <td className="px-3 py-2"><input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={r.ativo} onChange={(e) => executar({ acao: "salvar_recorrente", dados: { ...r, ativo: e.target.checked } })} aria-label={`${r.descricao} ativa`} /></td>
                <td className="px-3 py-2 text-right"><button className="text-xs text-ink-3 hover:text-[#b42318]" onClick={() => confirm(`Excluir "${r.descricao}"? Lançamentos já gerados continuam.`) && executar({ acao: "excluir_recorrente", id: r.id })}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="grid gap-2 border-t border-black/5 p-3 sm:grid-cols-7"
          onSubmit={(e) => {
            e.preventDefault();
            executar({ acao: "salvar_recorrente", dados: { ...rec, valor: numero(rec.valor), dia: Number(rec.dia), cliente_id: rec.cliente_id || null, ativo: true } });
            setRec({ ...rec, descricao: "", valor: "" });
          }}
        >
          <input className="input sm:col-span-2" placeholder="Descrição (ex.: Canva Pro)" value={rec.descricao} onChange={(e) => setRec({ ...rec, descricao: e.target.value })} required />
          <select className="input" value={rec.tipo} onChange={(e) => { const t = e.target.value as Tipo; setRec({ ...rec, tipo: t, categoria: d.categorias[t][0] }); }}>
            <option value="saida">Saída</option><option value="entrada">Entrada</option>
          </select>
          <select className="input" value={rec.categoria} onChange={(e) => setRec({ ...rec, categoria: e.target.value })}>
            {d.categorias[rec.tipo].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="input tabular" placeholder="Valor" inputMode="decimal" value={rec.valor} onChange={(e) => setRec({ ...rec, valor: e.target.value })} required />
          <input className="input tabular" type="number" min={1} max={28} title="Dia do mês" value={rec.dia} onChange={(e) => setRec({ ...rec, dia: e.target.value })} />
          <button className="btn-ghost">Adicionar</button>
        </form>
      </section>
    </div>
  );
}
