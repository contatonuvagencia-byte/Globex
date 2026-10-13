# Carla Vieira Tours: vídeo motion "experiências"

Vídeo motion de 35 s com a identidade visual da Carla Vieira Tours: vinho `#8b0028`, grafite `#231f20`, wordmark prateado e o "tours" em vinho, vetorizado a partir do logo no Canva.

**Arquivos finais** (`out/`)
- `carla-vieira-tours-16x9.mp4`: 1920×1080, 30 fps (YouTube, site, apresentações)
- `carla-vieira-tours-9x16.mp4`: 1080×1920, 30 fps (Reels, Stories, TikTok)

O vídeo é mudo para receber a trilha licenciada e/ou o OFF da Carla na edição.

## Roteiro
| Tempo | Cena |
|---|---|
| 0–5 s | "Não é sobre o destino. / É sobre o que você vive nele." |
| 5–11,6 s | Experiências pela janela do avião: pôr do sol em Santorini, aurora boreal na Islândia, balão na Capadócia, brinde em Paris |
| 11,6–16,6 s | Rota animada (Lisboa, Paris, Maldivas, Tóquio, Cancún): "Cada roteiro, desenhado para você." |
| 16,6–21,6 s | "Aqui a gente não vende pacote pronto.": Curadoria, Concierge, Suporte 24h, Na palma da mão |
| 21,6–25 s | "Viaje sozinha / a dois / em família / em grupo / a negócios / para dizer sim / do seu jeito." |
| 25–29 s | 28 anos viajando · 16 anos de agência · Top 12 melhores agências do Brasil (Fórum Panrotas 2025) |
| 29–35 s | "A viagem dos seus sonhos começa aqui." e assinatura com o logo |

## Como editar e renderizar
Textos, tempos e cenas ficam em `motion.js`. Os estilos ficam em `index.html`. Abra o `index.html` no navegador para ver a prévia em loop. Use `index.html?w=1080&h=1920` para a versão vertical.

```bash
ln -s "$(npm root -g)" node_modules   # usa o playwright global
node render.mjs 1920 1080 30 out/carla-vieira-tours-16x9.mp4
node render.mjs 1080 1920 30 out/carla-vieira-tours-9x16.mp4
```
Precisa de Node, Playwright (Chromium) e ffmpeg.
