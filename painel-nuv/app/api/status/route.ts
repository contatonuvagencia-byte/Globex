import { NextResponse } from "next/server";

// Diz ao navegador se a leitura automática por IA está ligada (só com ANTHROPIC_API_KEY, que é paga).
export async function GET() {
  return NextResponse.json({ ia: Boolean(process.env.ANTHROPIC_API_KEY) });
}
