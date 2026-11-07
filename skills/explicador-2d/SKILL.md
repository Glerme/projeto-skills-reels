---
name: explicador-2d
description: Faz um short vertical pt-BR de 90–125 s que "inventa do zero" uma máquina do dia a dia (freio de caminhão, privada, freio do elevador…) em desenho 2D chapado sobre fundo azul-marinho, no estilo do @inventadesdecero, com a nossa voz (Kokoro), a nossa legenda (estilo E) e som sintetizado. Use quando o usuário pedir "como funciona X" em 2D, "inventa do zero", "explicador 2D", "no estilo do inventadesdecero", ou quiser traduzir/adaptar um vídeo desse perfil.
---

# Explicador 2D (invente do zero)

Projeto: `~/Documentos/projetos/projeto-reels`. Roda no mesmo pipeline do `shorts-cartoon` (voz, palavras, mix,
legenda, check, render, QA), mas a imagem é um `scene.html` (SVG + GSAP) em vez do motor 3D.

## Fluxo

1. **Roteiro** (`worker.sh roteirista`, formato `explicador` de `skill/references/formatos.md`). Quando a base é um
   vídeo de referência, a nota leva a transcrição: traduza fiel para pt-BR, com a mesma cadeia de problema → solução,
   termos brasileiros (mola, esgoto, sapata, freio a ar), números por extenso e fonte para cada fato.
2. **Voz e palavras**: os dois comandos do passo 5 do `shorts-cartoon`.
3. **`video.json`** mínimo:
   ```json
   {"mode": "2d", "slug": "<slug>", "format": "explicador", "fps": 30, "duration": <fim da última palavra + 2,5>,
    "music": {"mood": "curioso"}, "sfx": [{"t": 1.2, "name": "pop", "gainDb": -9}]}
   ```
   Efeitos: pop, whoosh, boing, thud, ding, splash, creak, crash, steps, sparkle, tick, sting.
4. **Cena** (`WORKER_MODEL=opus bash scripts/worker.sh animador videos/<slug> "<nota>"`): escreve `scene.html`
   seguindo `references/estilo.md` e `references/como-fazer.md` (receita, partindo do exemplo
   `exemplos/freio-caminhao.scene.html`), monta e confere os stills. Antes do render:
   `node ~/.claude/skills/explicador-2d/scripts/cam-check.mjs videos/<slug>`.
5. **Render**: `bash scripts/render.sh videos/<slug>`. Se o QA acusar "pulos de imagem", é quase sempre uma chave de
   câmera colada na outra (o `cam-check` aponta qual).
6. **Comparação**: folha de stills do nosso lado a lado com a do original (`references/estilo.md`, "Conferir").
   Até 3 voltas de correção com o animador.

## Contrato do `scene.html`

- É um pedaço de HTML colado dentro de `#scene` (1080×1920) pelo `template/index-2d.html`. O fundo azul-marinho já
  vem do template.
- Os tweens vão em `tl` (timeline GSAP global, pausada). Tempos da fala: `at("palavra", n)` (n-ésima ocorrência, sem
  acento nem pontuação) ou `W(i)` (início da palavra de índice i do `words.json`). `at` dá erro se a palavra não existe.
- Determinístico: nada de `Math.random()` sem semente, `Date`, `requestAnimationFrame` nem `setTimeout`.
- A legenda é nossa (estilo E, embaixo, ~y 1300–1440). Mantenha o desenho entre y 220 e 1250.
- Nada de terceiros: sem frames, logos nem nome do canal de referência. O cartão final é nosso.
- Pegadinha do GSAP: em `tl.fromTo` com `scale` ou `rotation` em SVG, ponha o mesmo `svgOrigin` nos **dois** lados
  (from e to). Só no "to", a peça escorrega para o canto no fim do tween.
