import { NextResponse } from "next/server";
import { exigir, negado } from "@/lib/usuarios";

// Diz ao navegador se a leitura automática por IA está ligada (só com ANTHROPIC_API_KEY, que é paga).
export async function GET() {
  const eu = await exigir("logado");
  if (negado(eu)) return eu;
  return NextResponse.json({ ia: Boolean(process.env.ANTHROPIC_API_KEY) });
}
