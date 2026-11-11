"use client";
import { AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FichaForm, SITUACAO, type ClienteFicha } from "@/components/FichaForm";
import { useUsuario } from "@/components/Usuario";
import { brl, dataBR } from "@/lib/format";


export default function Clientes() {
  const router = useRouter();
  const { podeEditar } = useUsuario();
  const [lista, setLista] = useState<ClienteFicha[] | null>(null);
  const [erro, setErro] = useState("");
  const [verInativos, setVerInativos] = useState(false);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/clientes");
    const j = await r.json();
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setLista(j.clientes);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = (lista ?? []).filter((c) => verInativos || c.ativo);
  const atencao = (lista ?? []).filter((c) => c.ativo && (c.contrato.situacao === "vence_logo" || c.contrato.situacao === "vencido"));
  const receita = (lista ?? []).filter((c) => c.ativo && c.mensalidade != null).reduce((t, c) => t + (c.mensalidade ?? 0), 0);
  const mostraValores = (lista ?? []).some((c) => c.mensalidade != null);

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-sm font-medium text-ink-2">Carteira</p>
          <h1 className="titulo-pagina">Clientes</h1>
          <p className="mt-1 text-sm text-ink-2">A ficha de cada cliente junta contrato, contatos, briefing, posts, demandas, relatórios e pagamentos.</p>
        </div>
        <button className="so-editor btn-primary" onClick={() => setNovo(true)}><Plus size={16} /> Novo cliente</button>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[26px] bg-azul p-5 text-white">
          <p className="text-xs font-semibold text-white/70">Clientes ativos</p>
          <p className="tabular mt-1 text-3xl font-bold">{lista ? lista.filter((c) => c.ativo).length : "–"}</p>
        </div>
        {mostraValores && (
          <div className="rounded-[26px] bg-white p-5">
            <p className="text-xs font-semibold text-ink-2">Receita recorrente</p>
            <p className="tabular mt-1 text-2xl font-bold md:text-3xl">{brl(receita)}</p>
          </div>
        )}
        <div className={`rounded-[26px] p-5 ${atencao.length ? "bg-ink text-white" : "bg-white"}`}>
          <p className={`text-xs font-semibold ${atencao.length ? "text-white/70" : "text-ink-2"}`}>Contratos para renovar</p>
          <p className="tabular mt-1 text-3xl font-bold">{lista ? atencao.length : "–"}</p>
        </div>
      </div>

      {erro && <p className="mb-4 rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#a1261f]">{erro}</p>}

      {atencao.length > 0 && (
        <section className="mb-5 rounded-[26px] bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold"><AlertTriangle size={15} /> Renovar em breve</p>
          <div className="flex flex-wrap gap-2">
            {atencao.map((c) => (
              <Link key={c.id} href={`/clientes/${c.id}`} className={`chip px-3 py-1.5 text-xs ${SITUACAO[c.contrato.situacao].cls}`}>
                {c.nome} · {SITUACAO[c.contrato.situacao].r(c.contrato.dias)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <label className="mb-4 flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" className="h-4 w-4 accent-[#1f3fd1]" checked={verInativos} onChange={(e) => setVerInativos(e.target.checked)} />
        Mostrar ex-clientes
      </label>

      {!lista && !erro && <p className="text-sm text-ink-2">Carregando...</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((c) => (
          <Link key={c.id} href={`/clientes/${c.id}`} className={`card block p-5 transition hover:-translate-y-0.5 hover:shadow-md ${c.ativo ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-sm font-bold text-white">{c.nome.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold leading-tight">{c.nome}</p>
                <p className="truncate text-sm text-ink-2">{c.segmento ?? (c.contato_nome ? `Contato: ${c.contato_nome}` : "—")}</p>
              </div>
              {c.mensalidade != null && c.mensalidade > 0 && <p className="tabular text-sm font-bold">{brl(c.mensalidade)}</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className={`chip ${SITUACAO[c.contrato.situacao].cls}`}>{SITUACAO[c.contrato.situacao].r(c.contrato.dias)}</span>
              {!c.ativo && <span className="chip bg-surface-2 text-ink-3">ex-cliente</span>}
              {c.servicos.slice(0, 3).map((s) => <span key={s} className="chip bg-surface text-ink-2">{s}</span>)}
            </div>
            {c.contrato.fim && <p className="mt-2 text-xs text-ink-3">Contrato até {dataBR(c.contrato.fim)}</p>}
          </Link>
        ))}
      </div>

      {novo && (
        <FichaForm cliente={null} podeFinanceiro={podeEditar("financeiro")} onFechar={() => setNovo(false)} onSalvo={(id) => router.push(`/clientes/${id}`)} />
      )}
    </div>
  );
}
