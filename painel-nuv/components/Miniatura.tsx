"use client";
import { useState } from "react";

/** Miniatura da arte no card do post. Some sozinha se a imagem não carregar. */
export function Miniatura({ src, className = "" }: { src: string | null | undefined; className?: string }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  if (!src || falhou === src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFalhou(src)}
      className={`shrink-0 rounded-lg bg-white/60 object-cover ${className}`}
    />
  );
}
