"use client";
import { FileText, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useUsuario } from "./Usuario";

/** Atalhos comerciais no lead: fazer proposta e transformar em cliente. */
export function ViraCliente({ lead, onMudou }: { lead: { id: string; name: string; status: string }; onMudou: () => void }) {
  const { podeEditar } = useUsuario();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ mensalidade: "", dia_vencimento: "10", contrato_meses: "6" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [fichaId, setFichaId] = useState<string | null>(null);
  if (!podeEditar("leads")) return null;
  const podeFin = podeEditar("financeiro");

  async function converter() {
    setSalvando(true);
    setErro("");
    const r = await fetch(`/api/leads/${lead.id}/converter`, {
      method: "POST",
      body: JSON.stringify({
        servicos: ["Gestão de redes sociais"],
        contrato_meses: Number(f.contrato_meses),
        ...(podeFin ? { mensalidade: Number(f.mensalidade.replace(/\./g, "").replace(",", ".")) || 0, dia_vencimento: Number(f.dia_vencimento) || 10 } : {}),
      }),
    });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) return setErro(j.erro ?? "Erro");
    setFichaId(j.id);
    setAberto(false);
    onMudou();
  }

  return (
    <div className="mt-3 rounded-2xl bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/comercial?lead=${lead.id}`} className="btn-ghost px-3 py-1.5 text-xs"><FileText size={13} /> Fazer proposta</Link>
        {podeEditar("clientes") && !fichaId && (
          <button className="btn-azul px-3 py-1.5 text-xs" onClick={() => setAberto((a) => !a)}><PartyPopper size={13} /> Fechou! Virar cliente</button>
        )}
        {fichaId && <Link href={`/clientes/${fichaId}`} className="text-xs font-bold text-azul">✓ Agora é cliente · abrir ficha →</Link>}
      </div>
      {aberto && (
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {podeFin && (
            <>
              <label className="text-xs font-semibold text-ink-2 sm:col-span-2">Mensalidade (R$)
                <input className="input tabular mt-1 py-1.5" inputMode="decimal" value={f.mensalidade} onChange={(e) => setF({ ...f, mensalidade: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-ink-2">Vence dia
                <input className="input tabular mt-1 py-1.5" type="number" min={1} max={28} value={f.dia_vencimento} onChange={(e) => setF({ ...f, dia_vencimento: e.target.value })} />
              </label>
            </>
          )}
          <label className="text-xs font-semibold text-ink-2">Contrato
            <select className="input mt-1 py-1.5" value={f.contrato_meses} onChange={(e) => setF({ ...f, contrato_meses: e.target.value })}>
              {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
            </select>
          </label>
          <p className="text-xs text-ink-2 sm:col-span-3">Cria a ficha com os contatos do lead, começa o contrato hoje{podeFin ? " e já entra nas mensalidades do Financeiro" : ""}. O lead vai para “Fechado”.</p>
          <button className="btn-primary py-1.5 text-xs" disabled={salvando} onClick={converter}>{salvando ? "Criando..." : "Confirmar"}</button>
          {erro && <p className="text-xs text-[#a1261f] sm:col-span-4">{erro}</p>}
        </div>
      )}
    </div>
  );
}
