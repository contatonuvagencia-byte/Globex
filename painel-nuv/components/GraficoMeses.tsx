"use client";
import { useState } from "react";
import { MESES, brl } from "@/lib/format";

type Linha = { mes: string; entradas: number; saidas: number; lucro: number };

// azul da NUV para entradas, preto para saídas
const COR_ENTRADA = "#1f3fd1";
const COR_SAIDA = "#121212";

function arredondaEscala(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

const compacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function GraficoMeses({ dados }: { dados: Linha[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const m = { t: 12, r: 8, b: 28, l: 48 };
  const max = arredondaEscala(Math.max(...dados.flatMap((d) => [d.entradas, d.saidas])));
  const larguraGrupo = (W - m.l - m.r) / dados.length;
  const barra = Math.min(22, larguraGrupo / 3);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / max);
  const ticks = [0, max / 2, max];

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_ENTRADA }} />Entradas</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_SAIDA }} />Saídas</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Entradas e saídas dos últimos 6 meses">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={t === 0 ? 0.2 : 0.06} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8984">{compacto.format(t)}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const cx = m.l + larguraGrupo * i + larguraGrupo / 2;
          const barras = [
            { v: d.entradas, cor: COR_ENTRADA, x: cx - barra - 1 },
            { v: d.saidas, cor: COR_SAIDA, x: cx + 1 },
          ];
          return (
            <g key={d.mes} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>
              <rect x={cx - larguraGrupo / 2} y={m.t} width={larguraGrupo} height={H - m.t - m.b} fill={foco === i ? "#000" : "transparent"} fillOpacity={0.03} />
              {barras.map((b, j) => {
                const h = Math.max(0, y(0) - y(b.v));
                const r = Math.min(4, h, barra / 2);
                // topo arredondado, base reta apoiada no eixo
                const path = h > 0
                  ? `M${b.x},${y(0)} V${y(b.v) + r} Q${b.x},${y(b.v)} ${b.x + r},${y(b.v)} H${b.x + barra - r} Q${b.x + barra},${y(b.v)} ${b.x + barra},${y(b.v) + r} V${y(0)} Z`
                  : "";
                return <path key={j} d={path} fill={b.cor} />;
              })}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#52514e">
                {MESES[Number(d.mes.slice(5)) - 1].slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
      {foco !== null && (
        <div
          className="pointer-events-none absolute top-8 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((m.l + larguraGrupo * foco + larguraGrupo / 2) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="mb-1 font-semibold">{MESES[Number(dados[foco].mes.slice(5)) - 1]}</p>
          <p className="tabular">Entradas: {brl(dados[foco].entradas)}</p>
          <p className="tabular">Saídas: {brl(dados[foco].saidas)}</p>
          <p className="tabular font-medium">Lucro: {brl(dados[foco].lucro)}</p>
        </div>
      )}
    </div>
  );
}
