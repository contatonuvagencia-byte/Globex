# Reels: Beawst Global Connect 2026 (palestra + brindes)

- `out/beawst-reels-palestra.mp4`: 1080×1920, 30fps, H.264, 21,5s, sem áudio
- `out/cena-1..6-*.png`: 1 print por cena para revisão
- `video.html`: animação. **Textos, cores, tempos e área segura ficam no objeto `CONFIG`, no topo do arquivo.** Abra no navegador para ver ao vivo.
- `render.mjs`: gera o MP4 e os prints e confere se algum texto saiu da área segura (`node render.mjs`, precisa de Playwright e ffmpeg)

Para incluir a foto da Camila: salve em `assets/camila.jpg`, troque `PHOTO_CAMILA: null` por `PHOTO_CAMILA: 'assets/camila.jpg'` e rode `node render.mjs`.
