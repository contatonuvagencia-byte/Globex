import { calendarioPorId } from "@/lib/calendarios";
import { veCliente } from "@/lib/permissoes";
import { baixarAnexo, cardsDoQuadro, quadroDoCalendario } from "@/lib/trello";
import { exigir, negado } from "@/lib/usuarios";

// Entrega a imagem de um anexo do Trello. Só serve anexos de cards do quadro desse cliente.
export async function GET(req: Request) {
  const eu = await exigir("calendario", "ver");
  if (negado(eu)) return eu;
  const q = new URL(req.url).searchParams;
  const cal = await calendarioPorId(q.get("cal") ?? "").catch(() => null);
  if (!cal || !veCliente(eu, cal.nome)) return new Response(null, { status: 403 });
  try {
    const quadro = await quadroDoCalendario(cal);
    if (!quadro) return new Response(null, { status: 404 });
    const card = (await cardsDoQuadro(quadro.id)).find((c) => c.id === q.get("card"));
    const anexo = card?.anexos.find((a) => a.id === q.get("anexo"));
    if (!anexo) return new Response(null, { status: 404 });
    const url = q.get("tamanho") === "original" || !anexo.urlMiniatura ? anexo.urlOriginal : anexo.urlMiniatura;
    const res = await baixarAnexo(url);
    return new Response(res.body, {
      headers: {
        "content-type": res.headers.get("content-type") ?? "image/png",
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
