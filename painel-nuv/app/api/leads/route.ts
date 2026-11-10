import { NextResponse } from "next/server";
import { LeadIn, criarLead, listarLeads } from "@/lib/leads";

export async function GET() {
  try {
    return NextResponse.json({ leads: await listarLeads() });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const corpo = LeadIn.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Dados inválidos", detalhes: corpo.error.issues }, { status: 400 });
  try {
    return NextResponse.json({ id: await criarLead(corpo.data) });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
