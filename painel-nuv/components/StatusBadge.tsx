const ESTILOS: Record<string, { cls: string; icone: string }> = {
  Publicado: { cls: "bg-ink text-white", icone: "✓" },
  Aprovado: { cls: "bg-azul text-white", icone: "●" },
  "Aguardando aprovação": { cls: "bg-azul-claro text-azul-escuro", icone: "◐" },
  "Em produção": { cls: "bg-white/80 text-ink", icone: "◐" },
  "Em Produção": { cls: "bg-white/80 text-ink", icone: "◐" },
};

export function StatusBadge({ status }: { status: string }) {
  const e = ESTILOS[status] ?? { cls: "bg-white/70 text-ink-2", icone: "○" };
  return (
    <span className={`chip ${e.cls}`}>
      <span aria-hidden>{e.icone}</span>
      {status}
    </span>
  );
}
