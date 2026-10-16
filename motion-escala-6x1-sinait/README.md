# Motion — Fim da escala 6x1 (SINAIT DS/MG)

Identidade visual SINAIT DS/MG: laranja `#cc4e00`, creme `#F6F4F2`, preto `#200100`; fontes Anton (títulos) e Montserrat (textos).

Vídeo vertical 1080×1920, 30 s, 30 fps, sem áudio (pronto para trilha).

| Arquivo | O que é |
| --- | --- |
| `fim-da-escala-6x1-sinait.mp4` | Vídeo final para Reels/Stories/TikTok |
| `index.html` | Fonte da animação (abre no navegador com play, pausa e linha do tempo) |
| `capa.png` | Quadro final, para usar como capa |
| `logo-sinait-dsmg.png` | Logo com fundo transparente, recortado do board de identidade |
| `render.mjs` | Gera o MP4 a partir do HTML (Playwright + ffmpeg): `node render.mjs` |

## Roteiro

| Tempo | Cena | Texto em tela |
| --- | --- | --- |
| 0–4,5 s | A semana 6x1 | "6 dias de trabalho." Seis blocos de trabalho (7h20 cada, 44h na semana) e um de folga |
| 4,5–9,5 s | O único dia | "1 dia para viver." Descansar, cuidar da casa, ver a família, estudar, ir ao médico. Tudo em 24 horas. |
| 9,5–15,5 s | A conta | 52 folgas por ano na 6x1 contra 104 na 5x2. "Metade do descanso." |
| 15,5–20,5 s | O custo | "Jornada exaustiva cobra a conta." Fadiga acumulada, mais risco de acidentes, adoecimento físico e mental |
| 20,5–25 s | A fiscalização | "Quem fiscaliza vê de perto." O SINAIT defende o fim da escala 6x1. |
| 25–30 s | Fechamento | A semana vira 5x2. "Mais vida além do trabalho." #FimDaEscala6x1 + logo SINAIT DS/MG |

Para editar textos ou tempos, altere `index.html` (cada cena está comentada no `render(t)`) e rode `node render.mjs` de novo.
