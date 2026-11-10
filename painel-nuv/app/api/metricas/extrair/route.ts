import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extrairRelatorio, type ArquivoEnviado } from "@/lib/metricas";

export const maxDuration = 300;

const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const MAX_TOTAL = 30 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const cliente = String(form.get("cliente") ?? "").slice(0, 80);
  const rede = String(form.get("rede") ?? "Instagram").slice(0, 40);
  const periodoAtual = String(form.get("periodo_atual") ?? "").slice(0, 60);
  const periodoAnterior = String(form.get("periodo_anterior") ?? "").slice(0, 60) || null;
  if (!cliente || !periodoAtual) return NextResponse.json({ erro: "Informe cliente e período" }, { status: 400 });

  const arquivos: ArquivoEnviado[] = [];
  let total = 0;
  for (const periodo of ["atual", "anterior"] as const) {
    for (const item of form.getAll(`arquivos_${periodo}`)) {
      if (!(item instanceof File)) continue;
      if (!TIPOS.includes(item.type)) {
        return NextResponse.json({ erro: `Formato não aceito: ${item.name}. Use PNG, JPG, WEBP ou PDF.` }, { status: 400 });
      }
      total += item.size;
      if (total > MAX_TOTAL) return NextResponse.json({ erro: "Arquivos grandes demais (máx. 30 MB no total)" }, { status: 413 });
      const base64 = Buffer.from(await item.arrayBuffer()).toString("base64");
      arquivos.push({ nome: item.name, tipo: item.type, base64, periodo });
    }
  }
  if (!arquivos.some((a) => a.periodo === "atual")) {
    return NextResponse.json({ erro: "Envie pelo menos um print ou PDF do período atual" }, { status: 400 });
  }

  try {
    const relatorio = await extrairRelatorio({ cliente, rede, periodoAtual, periodoAnterior, arquivos });
    return NextResponse.json({ relatorio, arquivos: arquivos.map((a) => a.nome) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ erro: "ANTHROPIC_API_KEY inválida" }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ erro: "Limite de uso da API atingido. Tente de novo em instantes." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ erro: `Erro da API do Claude: ${e.message}` }, { status: 502 });
    }
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
