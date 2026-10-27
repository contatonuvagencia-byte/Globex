# Reel "Quem vai comandar a Global Connect"

Entregas em `out/`: `reel-apresentadora.mp4` (1080×1920, 30fps, H.264 + AAC, 30s) e `capa-reel-apresentadora.png`.

## Trocar textos e renderizar de novo
1. Edite o `CONFIG` no topo de `video.html` (nome, credencial, prêmio, data, cores, tempos das cenas).
2. Coloque os assets em `assets/` (os que faltam aparecem como retângulo "FALTA <arquivo>"):
   `apresentadora.jpg` ou `.mp4`, `logo-feira.png`, `parceiros/*.png`, `trilha.mp3`, `locucao.mp3` (opcional).
   `kit.png` e `mala.png` são opcionais: sem eles, o render usa as ilustrações de `assets/ilustracoes/*.svg`,
   regeneradas a cada render com o logo da feira (`LOGO_PREMIOS` no `render.mjs`).
3. `node render.mjs` (precisa de Playwright/Chromium, ffmpeg e python3 com numpy).
   `node render.mjs --stills` gera só a capa e os prints de conferência.

Sem `trilha.mp3`, o script gera uma trilha provisória (`trilha.py`) no tempo dos cortes.
Com `locucao.mp3`, a trilha abaixa e as legendas de `CONFIG.legendas` aparecem (ajuste os tempos à locução).
Abrir `video.html` no navegador mostra a animação ao vivo.
