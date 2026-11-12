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
python3 build.py bruto.mp4 narracao.mp3 work/ canva-video-export.mp4 sandiego.mp4
node render.mjs work/ narracao.mp3 out/reel-carlavieira-diversa360.mp4
```

Os vídeos brutos não ficam no repositório (tamanho): `bruto.mp4` (~3 min: mala, mapa,
Califórnia, Nova York, Estátua), `canva-video-export.mp4` (~46 s: avião, Times Square, brinde,
pratos) e `sandiego.mp4` (65 s: torre, skyline de drone, palmeiras no pôr do sol).

### Narração v3 (com San Diego)

- `roteiro-v3.txt`: texto com as tags de entonação, do jeito que foi colado no ElevenLabs.
- `words.json`: tempo de cada palavra. Sem reconhecedor de voz disponível, ele sai do
  `align.py`: as pausas do áudio são casadas com o texto (`breaks-narracao-v3.txt`, conferido
  pela energia do áudio) e, dentro de cada frase, as palavras dividem o tempo na proporção da
  narração anterior (`words-narracao-v2.json`).

```bash
python3 align.py narracao.mp3 roteiro-v3.txt words-narracao-v2.json breaks-narracao-v3.txt > words.json
```

### Fotos e logos

- Abertura: foto do casal emoldurada, símbolo Diversa 360° acima e as logos Carla Vieira Tours
  e Diversa Turismo abaixo.
- Final: foto do Anderson com a mala, com as duas logos e o "Embarque 15/11".
- `logos.py` gera as versões brancas transparentes (`assets/logo-*.png`) a partir dos originais
  em `assets/logos-src/`.

Fontes: Open Sauce Sans (OFL). A Yellowtail substitui a Biro Script Plus, que é comercial.

## Trilha

`music.py` gera uma trilha original por síntese (sem áudio de terceiros), com a curva presa aos tempos das cenas. Para usar no render: `MUSIC=trilha.wav node render.mjs ...`. A música entra com ducking (sidechain) sob a narração.

```bash
python3 music.py trilha.wav 80.0
```
