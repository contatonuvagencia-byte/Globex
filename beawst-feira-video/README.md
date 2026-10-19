# Beawst Global Connect 2026 — vídeo da feira (Reels)

Vídeo vertical 1080×1920, 30 fps, 25 s, com trilha própria (120 BPM) e transições no ritmo.

**Arquivo final:** `out/beawst-feira-reels.mp4`

## Roteiro
| Tempo | Cena |
|---|---|
| 0–3s | Gancho: "Pensando em ESTUDAR FORA?" / "Ainda nem decidiu o destino? Melhor ainda." |
| 3–6s | Sem passagem, sem hospedagem, sem fila → **100% ONLINE** |
| 6–9s | Revelação do logo + "Conexões que abrem o mundo!" |
| 9–12s | "Uma feira. Vários caminhos internacionais." |
| 12–17s | As 4 áreas: Educação internacional, Intercâmbio, Mobilidade & Vistos, Parceiros & Especialistas |
| 17–21s | 07.11 · Novembro · 08h–13h · 100% online |
| 21–25s | CTA: SAVE THE DATE |

## Como editar e renderizar de novo
- Abra `video.html` no navegador para ver a animação em tempo real.
- Textos, cores e tempos estão no próprio `video.html`.
- Renderizar: `node render.mjs out/beawst-feira-silent.mp4` (Playwright + ffmpeg)
- Trilha: `python3 trilha.py out/trilha.wav`
- Juntar: `ffmpeg -i out/beawst-feira-silent.mp4 -i out/trilha.wav -c:v copy -c:a aac -shortest out/beawst-feira-reels.mp4`

O logo em `assets/logo.png` foi recortado da arte do Post 4. Se tiver o arquivo original em alta, troque por ele.
