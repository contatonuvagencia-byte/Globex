# Reel "Quem vai comandar a Global Connect"

Entregas em `out/`: `reel-apresentadora.mp4` (1080×1920, 30fps, H.264 + AAC, 30s) e `capa-reel-apresentadora.png`.

## Trocar textos e renderizar de novo
1. Edite o `CONFIG` no topo de `video.html` (nome, credencial, prêmio, data, cores, tempos das cenas).
2. Coloque os assets em `assets/` (os que faltam aparecem como retângulo "FALTA <arquivo>"):
   `apresentadora.jpg` ou `.mp4`, `logo-feira.png`, `logo-beawst.png`, `kit.png`, `mala.png`, `parceiros/*.png`, `trilha.mp3`, `locucao.mp3` (opcional).
3. `node render.mjs` (precisa de Playwright/Chromium, ffmpeg e python3 com numpy).
   `node render.mjs --stills` gera só a capa e os prints de conferência.

Sem `trilha.mp3`, o script gera uma trilha provisória (`trilha.py`) no tempo dos cortes.
Com `locucao.mp3`, a trilha abaixa e as legendas de `CONFIG.legendas` aparecem (ajuste os tempos à locução).
Abrir `video.html` no navegador mostra a animação ao vivo.
