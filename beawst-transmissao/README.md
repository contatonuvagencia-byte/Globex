# Artes da transmissão: Beawst Global Connect 2026

Seguem o "Manual de Especificações de Arte e Vídeo — Eventos Remotos": 1920×1080, RGB, margem segura de 60px.

| Arquivo | Uso | Transparência |
|---|---|---|
| 01_TELA_ESPERA.png | "Iniciaremos em breve!" | 100% fechada |
| 02_TELA_INTERVALO.png | "Intervalo! Voltamos já!" | 100% fechada |
| 03_TELA_FINAL.png | "Agradecemos por estar conosco." | 100% fechada |
| 04_MASCARA_1_CAMERA.png | 1 participante | recorte 1536×864 |
| 05_MASCARA_2_CAMERAS.png | 2 participantes | 2 recortes 880×495 |
| 06_MASCARA_3_CAMERAS.png | 3 participantes | 3 recortes 736×414 |
| 07_MASCARA_4_CAMERAS.png | 4 participantes | 4 recortes 736×414 |
| 08_MASCARA_PPT_E_CAMERA.png | slides + câmera | PPT 1344×756 + câmera 400×400 |
| 09_VINHETA.mp4 | vinheta de abertura/virada de bloco (7s) | MP4 H.264 · 30fps · Rec.709 · 12 Mbps · AAC 48 kHz estéreo |
| 09_VINHETA_B.mp4 | vinheta opção B "Conexões", fundo claro (6s) | mesmo padrão da 09_VINHETA |
| 10_FUNDO_VIRTUAL_PALESTRANTE.png | fundo virtual da webcam (Zoom/Meet/Teams) | 100% fechada |
| 11_A_SEGUIR_<NOME>.png | anúncio da próxima palestra | 100% fechada |
| 12_MASCARA_PPT_E_CAMERA_<NOME>.png | slides + câmera com nome e tema | PPT 1344×756 + câmera 400×400 |
| 13_TARJA_NOME_<NOME>.png | tarja de nome (GC) sobre a câmera | fundo transparente |

Fotos das palestrantes: `assets/palestrantes/leia.jpg` e `assets/palestrantes/alessandra.jpg` (sem a foto aparece a inicial).
Palestrantes e textos: objeto `PALESTRANTES` em `telas.html` (e a lista em `render.mjs`). Gerar de novo: `node render.mjs`.

Vinheta: `vinheta.html` (animação) + `vinheta_audio.py` (áudio sintetizado, pico -6 dBFS). Gerar: `node vinheta.mjs` (opção A) ou `node vinheta.mjs b` (opção B, `vinheta-b.html`).
