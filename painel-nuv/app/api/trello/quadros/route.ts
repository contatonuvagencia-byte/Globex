import { NextResponse } from "next/server";
import { listarQuadros, trelloConfigurado } from "@/lib/trello";
import { exigir, negado } from "@/lib/usuarios";

// Lista os quadros do Trello (para escolher o quadro de cada calendário).
export async function GET() {
  const eu = await exigir("admin");
  if (negado(eu)) return eu;
  if (!trelloConfigurado()) return NextResponse.json({ configurado: false, quadros: [] });
  try {
    return NextResponse.json({ configurado: true, quadros: await listarQuadros() });
  } catch (e) {
    return NextResponse.json({ configurado: true, quadros: [], erro: (e as Error).message });
  }
}
