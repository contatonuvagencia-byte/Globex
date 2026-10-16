# Motion — O que muda com o fim da escala 6x1 (SINAIT DS/MG)

Vídeo 1080×1350 (feed 4:5), 36 s, 30 fps, sem áudio (pronto para trilha).
Identidade SINAIT DS/MG: laranja `#cc4e00`, creme `#F6F4F2`, preto `#200100`; Anton (títulos) e Montserrat (textos).

Plano contínuo, sem cortes: os mesmos objetos atravessam o vídeo e se transformam. O título vira cabeçalho, a semana muda de altura conforme a jornada, a câmera percorre a linha do tempo e o ano gira como um odômetro.

| Arquivo | O que é |
| --- | --- |
| `fim-da-escala-6x1-sinait.mp4` | Vídeo final |
| `index.html` | Fonte da animação (abre no navegador com play, pausa e linha do tempo) |
| `capa.png` | Quadro do "104 folgas por ano", para capa |
| `logo-sinait-dsmg.png` | Logo com fundo transparente, recortado do board de identidade |
| `render.mjs` | Gera o MP4 a partir do HTML (Playwright + ffmpeg): `node render.mjs` |

## Roteiro

| Tempo | Movimento | Texto |
| --- | --- | --- |
| 0–4 s | Título entra por máscara e encolhe até virar cabeçalho | "O que muda? com o fim da escala 6x1" |
| 4–8 s | Barras da semana sobem (8h por dia), régua do tempo começa em 1932 | "Decretos de 1932 limitam a jornada na indústria e no comércio a 8 horas por dia." · Limite: 48h por semana |
| 8–11 s | Câmera desliza para 1943, ano gira | "A CLT consolida a regra: 8 horas por dia, 48 por semana." |
| 11–16 s | Câmera percorre 45 anos até 1988; barras baixam para 7h20; limite gira de 48h para 44h | "A Constituição reduz o limite para 44 horas semanais." |
| 16–20 s | Chega em "Hoje" (2026); as barras de trabalho pulsam | "Mas a escala 6x1 continua: seis dias de trabalho para um de descanso." |
| 20–23 s | "Próximo passo": "Escala 6x1" é riscada e o sábado vira folga | "Garantir dois dias de descanso por semana para quem trabalha." |
| 23–32 s | A semana sobe e encolhe; folgas por ano giram de 52 para 104; a faixa troca de palavra | "Mais tempo para descansar / a família / estudar / cuidar da saúde / viver" |
| 32–36 s | Faixa laranja cobre a tela | "Mais vida além do trabalho." #FimDaEscala6x1 + logo |

Fontes dos marcos: Decretos 21.186 e 21.364 de 1932; CLT (Decreto-Lei 5.452/1943), art. 58; Constituição Federal de 1988, art. 7º, XIII.
As 104 folgas são o cálculo de 2 folgas × 52 semanas, sem férias e feriados.
