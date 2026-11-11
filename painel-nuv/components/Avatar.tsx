/* eslint-disable @next/next/no-img-element */
export function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

/** Foto da pessoa ou, sem foto, as iniciais num círculo azul. */
export function Avatar({ nome, foto, tamanho = 32, className = "" }: { nome: string; foto?: string | null; tamanho?: number; className?: string }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(9, Math.round(tamanho * 0.36)) };
  return foto ? (
    <img src={foto} alt={nome} title={nome} style={estilo} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span title={nome} style={estilo} className={`grid shrink-0 place-items-center rounded-full bg-azul font-bold text-white ${className}`}>
      {iniciais(nome)}
    </span>
  );
}
