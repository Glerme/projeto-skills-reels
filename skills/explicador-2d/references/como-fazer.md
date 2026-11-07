# Como fazer o scene.html (receita do freio-caminhao)

Exemplo completo e aprovado pelo usuário: `exemplos/freio-caminhao.scene.html` (88 s, 20 blocos, QA sem problema).
Para um vídeo novo, copie o arquivo, mantenha a parte "base" e "helpers" e troque só os blocos e as chaves de câmera.

## 1. Ler a referência antes de desenhar

- `agentes/ref/sheet.jpg` (um quadro a cada 3 s) dá a sequência; `ref/frames/r-NNN.jpg` dá os detalhes. Junte 4
  quadros-chave lado a lado (`ffmpeg … hstack=4`) para ver as peças: câmara, roda, manômetro, cartão final.
- Liste os índices do `words.json` (`i:palavra@início`) e marque onde cada frase começa. Cada frase vira um bloco.

## 2. Estrutura do arquivo

- Um `<svg>` 1080×1920 com `<defs>` (sombra `#sh`, brilho, gradientes), `<g id="stars">` fora da câmera e
  `<g id="cam">` com tudo o que a câmera mexe. Um `<script>` numa IIFE monta o SVG e os tweens.
- **Helpers** (prontos no exemplo): `E`/`G`/`H` criam elementos; `rnd()` com semente; `pop`, `fadeIn`, `fadeOut`;
  `label` (pílula + linha de chamada); `pipe` (tubo com fluido que corre por `stroke-dashoffset`); `airFlow`
  (pontinhos andando no tubo); `puffs`, `drops`; `tank`, `gauge`, `wheel` (aro girando + sapatas), `springChamber`
  (mola, placa, ar, haste, com `to("braked"|"released")`), `linkTo` (haste até a roda), `truck`, `world` (cidade,
  nuvens, estrada que anda), `roll`, `arrow`, `shake`.
- **Bloco** = `block(t0, t1, [[t2, t3]])`: um grupo que entra e sai em crossfade de 0,4 s; a lista extra reabre o
  mesmo desenho depois (o compressor volta após a cena da válvula, com o estado guardado). Cada bloco cria as próprias
  peças com os helpers: é mais simples do que reaproveitar uma instância entre trechos com estados diferentes.
- Estado inicial sempre com `gsap.set` (fora da `tl`); na `tl` só `to`/`set`. Nunca dois tweens da mesma
  propriedade sobrepostos no mesmo elemento. Rotação/escala em SVG sempre com `svgOrigin`.

## 3. Câmera

- Lista `K = [[t, focoX, focoY, escala], …]`; cada par vira um `tl.to(cam)` com `sine.inOut`. O foco vai para o
  centro (540, 735): `x = -s·(fx-540)`, `y = -s·(fy-735)`.
- Por bloco: uma chave 0,3 s depois do início, uma em cada palavra-chave (peça que a fala cita) e uma 0,1 s antes do
  fim. Entre blocos a câmera anda junto com o crossfade.
- **Erro que o QA pega:** duas chaves a menos de ~0,35 s com enquadramentos diferentes (ex.: `W(129)+.3` e `W(132)`
  caíram a 0,02 s). Rode `scripts/cam-check.mjs` e empurre a chave para a palavra seguinte.
- Zoom alto (escala > 1,05) com foco acima do centro empurra o pé do desenho para a legenda: confira que
  `735 + s·(y_baixo - fy)` ≤ 1250. Etiqueta perto da borda some no pan: esconda-a antes (`fadeOut`).

## 4. Efeitos sonoros

Gere o `sfx` do `video.json` com um script Python a partir dos mesmos índices `W(i)` do scene: `pop` −9 em cada
etiqueta, `whoosh` −10 0,2 s antes de cada bloco, `crash`/`thud` em estouro e impacto, `boing` na mola, `tick` no
manômetro e na lista de verbos, `ding` no "funciona", `sparkle` na ideia e no parabéns, `sting` no alarme e no
"sem freio".

## 5. Conferir (duas voltas no mínimo)

1. `~/.venvs/shorts/bin/python -m pipeline.assemble videos/<slug>`
2. `bash scripts/snap.sh videos/<slug> 1.5,4.5,…` (um a cada 3 s) e folha `tile=6x5`; olhe ao lado da referência.
   Quadros em cima de uma troca de bloco mostram dois desenhos (crossfade): normal.
3. Erros achados no freio-caminhao: um bloco longo cobrindo outro que estava no meio dele (resolvido com a janela
   extra do `block`), roda e etiqueta entrando na legenda, etiqueta cortada na borda, mão fora do quadro visível
   antes de entrar (comece com `opacity: 0`).
4. `cam-check`, render, e `qa/report.md` precisa dizer "nenhum problema".
