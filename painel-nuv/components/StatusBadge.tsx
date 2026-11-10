const ESTILOS: Record<string, { cls: string; icone: string }> = {
  Publicado: { cls: "bg-[#e6f4ea] text-[#0f6b2f]", icone: "✓" },
  Aprovado: { cls: "bg-[#e7f0fb] text-[#1d5fae]", icone: "●" },
  "Aguardando aprovação": { cls: "bg-[#fdf3dc] text-[#8a5a00]", icone: "◐" },
  "Em produção": { cls: "bg-[#fdf3dc] text-[#8a5a00]", icone: "◐" },
  "Em Produção": { cls: "bg-[#fdf3dc] text-[#8a5a00]", icone: "◐" },
};

export function StatusBadge({ status }: { status: string }) {
  const e = ESTILOS[status] ?? { cls: "bg-surface-2 text-ink-2", icone: "○" };
  return (
    <span className={`chip ${e.cls}`}>
      <span aria-hidden>{e.icone}</span>
      {status}
    </span>
  );
}
