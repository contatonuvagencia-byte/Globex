# NUV · Reels "5 coisas que me fariam comprar de você" — pacote de motion

Animações e ilustrações para editar por cima do vídeo no editor que você usar (CapCut, Premiere etc.).
Tudo em **1080×1920 (9:16), 30 fps**, nas cores da marca (`#EFEAE4`, `#CBC5B9`, `#0A2540`, `#313D65`) com Comfortaa nos textos de apoio.

> **Fonte dos títulos:** a Perandory não estava disponível aqui, então os títulos usam **DM Serif Display** provisoriamente.
> Coloque `Perandory.otf` (ou `.ttf`) em `assets/fonts/` e rode `node render.mjs` que tudo sai de novo com a fonte certa.

## Onde usar cada animação

| Arquivo | Tipo | Duração | Onde entra (transcrição) |
|---|---|---|---|
| `00_abertura_capa` | com fundo | 4s | Abertura / capa do Reels (também serve de thumbnail) |
| `01_gancho_texto` | sem fundo | 4,6s | 00:00 "Se você fizesse essas coisas no Instagram…" |
| `02_dica1_titulo` | sem fundo | 3,6s | 00:03 "A primeira coisa seria ver você" |
| `07_dica1_equipe` | com fundo | 6s | 00:04–00:09 "quem é a equipe, quem vai me atender" |
| `03_dica2_titulo` | sem fundo | 3,6s | 00:09 "A segunda coisa seria você me mostrar o produto" |
| `08_dica2_vida_real` | com fundo | 6s | 00:11–00:17 "produto sendo usado na vida real… não só uma foto bonitinha" |
| `04_dica3_titulo` | sem fundo | 3,6s | 00:17 "Terceiro: posts respondendo dúvidas" |
| `09_dica3_vergonha_direct` | sem fundo | 4,2s | 00:21 "posso ter uma vergonha de chegar no seu direct" |
| `10_dica3_cards_duvidas` | sem fundo | 7s | 00:27–00:37 "como funciona o processo / quanto tempo / quanto custa" |
| `05_dica4_titulo` | sem fundo | 3,6s | 00:39 "Quarta coisa: feedback de cliente" |
| `11_dica4_feedbacks` | sem fundo | 6,5s | 00:42–00:58 "alguém falando bem… ajudou na rotina" |
| `06_dica5_titulo` | sem fundo | 3,6s | 00:58 "a quinta e última coisa: link da bio funcionando" |
| `12_dica5_link_bio` | com fundo | 7,5s | 01:03–01:12 "chega lá e o link não tá funcionando" |
| `13_salva_esse_video` | sem fundo | 3,8s | 01:21 "Então já salva esse vídeo" |
| `14_chama_no_direct` | sem fundo | 4s | 01:27 "é só chamar a gente no direct ou no link" |
| `15_encerramento_logo` | com fundo | 5s | Final, depois da última fala |

As animações sem fundo já entram e saem sozinhas (com transição de entrada e de saída). É só posicionar na linha do tempo.
Os cards de dúvidas (`10`) aparecem um a cada 1,5s. Se quiser sincronizar com a fala, divida o clipe ou ajuste a velocidade.

## Formatos

- `out/com-fundo/*.mp4`: H.264, use direto como B-roll em tela cheia.
- `out/sem-fundo/*.mov`: **ProRes 4444 com transparência real**. Funciona no Premiere, After Effects, Final Cut, DaVinci e CapCut para computador.
- `out/sem-fundo-verde/*_verde.mp4`: a mesma animação sem fundo, mas em **fundo verde**. No **CapCut do celular**, use Recortar → Chroma key → selecione o verde (intensidade ~20, sombra ~10).
- `out/previa_todas_animacoes.mp4`: todas as animações em sequência, só para conferir.

## Imagens geradas (Canva)

Ilustrações extras de apoio, geradas no Canva da agência (abrir e baixar em alta por lá):
[Equipe](https://www.canva.com/M/MAHYIPZKE_w) ·
[Produto na vida real](https://www.canva.com/M/MAHYIME3WhY) ·
[Feed respondendo dúvidas](https://www.canva.com/M/MAHYIPDrzgs) ·
[Feedbacks](https://www.canva.com/M/MAHYIFhxs9s) ·
[Link da bio](https://www.canva.com/M/MAHYIHIZ9Iw)

## Como gerar de novo

```bash
node render.mjs                    # todas as cenas (~3 min)
node render.mjs 12_dica5_link_bio  # só uma cena
node render.mjs --stills           # só quadros PNG de conferência em out/stills
```

As cenas ficam em `scenes.js` (textos, cores e tempos editáveis). O render usa Chromium (Playwright) + ffmpeg.
Os depoimentos da dica 4 ("Ana C.", "Bruno M.", "Carla S.") são **exemplos ilustrativos**. Troque por depoimentos reais de clientes se for usar como prova social.
