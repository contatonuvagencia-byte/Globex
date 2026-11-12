# Reel Diversa 360° USA Edition 2026 · CarlAVieira Tours

Reel vertical 1080×1920, H.264, 30 fps, 80,3 s, montado com ffmpeg a partir do bruto de takes
e da narração (ElevenLabs), acelerada 1,08× sem alterar o tom.

- `build.py`: lista de cortes ancorada nas palavras da narração (`words.json`, transcrição
  Whisper com tempo por palavra). Corta, faz o color grading de cada take (Califórnia quente e
  dourada, Nova York fria, Estátua em tom noturno), aplica push-in, whip pan entre cidades e
  monta tudo.
- `overlay.html` + `render.mjs`: legendas, cards de cidade, card "Agência Top Seller" e
  encerramento com logos, renderizados em camada transparente e compostos sobre o vídeo
  junto com a narração.

```bash
python3 build.py bruto.mp4 narracao.mp3 work/
node render.mjs work/ narracao.mp3 out/reel-carlavieira-diversa360.mp4
```

Fontes: Open Sauce Sans (OFL). A Yellowtail substitui a Biro Script Plus, que é comercial.

## Trilha

`music.py` gera uma trilha original por síntese (sem áudio de terceiros), com a curva presa aos tempos das cenas. Para usar no render: `MUSIC=trilha.wav node render.mjs ...`. A música entra com ducking (sidechain) sob a narração.

```bash
python3 music.py trilha.wav 80.0
```
