# video.json: o plano de cenas

Exemplo completo: `pipeline/tests/fixtures/mini/video.json`. Valide com
`~/.venvs/shorts/bin/python -m pipeline.assemble --check videos/<slug>` (rode `npm run validate:build` uma vez antes).
Ele resolve o elenco do acervo e cita a cena de cada erro.

```json
{ "version": 1, "slug": "polvo", "format": "curiosidade", "fiction": false, "fps": 30, "duration": 3.1,
  "cast": { "biologa": "cientista", "homem": "homem" },
  "shots": [ { "id": 1, "start": 0, "end": 3.1, "set": "laboratorio", "light": "day",
               "cam": { "recipe": "push", "from": "medio", "punch": [1.8] },
               "actors": [ { "who": "biologa", "at": "centro", "action": "point", "expr": [[0, "neutral"], [1.7, "shock"]] } ],
               "dof": 11, "focus": "biologa", "kicks": [2.9] } ],
  "flash": [3.1], "sfx": [ { "t": 2.9, "name": "pop" } ], "music": { "mood": "curioso" } }
```

## Campos

**Tempos e duração:**
- Os tempos são em segundos, tirados de `words.json`.
- As cenas são contíguas de 0 até `duration`, e cada uma dura pelo menos 0,5 s.
- `duration` = fim da última palavra + 0,6–0,9 s.

**`cast`:** nome do papel → id do acervo (`kit/characters/<id>.json`) ou um CharDef completo.

**`shots`:**
- `set` + `light`: `day` ou `golden` (fim de tarde, quente, contraluz).
- `cam`:
  - `from`: a view inicial;
  - `recipe`:
    - `hold`: avanço lento de 0,25 %/f;
    - `push`: avanço mais rápido, 0,6 %/f;
    - `glide`: desliza de `from` até `to` em 18–40 frames;
  - `punch`: tempos de avanço extra, nas palavras de impacto.
- `actors[]`:
  - `who`, `at` (spot), `to` (spot, só para `walk`), `action`, `expr` (lista de [tempo, expressão], com tempos
    **absolutos do vídeo**, dentro da cena; o primeiro costuma ser o `start` da cena) e
    `facing` (−1, 0 ou 1);
  - `cue`: o tempo absoluto do momento-chave da ação (`whirl`, `topple`).
  - `hold`: objeto na mão, independente da ação: `{"L": "staff"}`. Valores: `stone staff spear helmet sling`.
  - até 3 atores por cena: o quadro vertical é estreito.
- `throws`: `[{from, to, start, end}]`. É uma pedra visível, com rastro, da mão de quem lança (mão levantada do lado
  esquerdo) até a testa do alvo, com brilho no acerto. Combine com `whirl` (`cue` = `start`) e `topple` (`cue` = `end`).
- `dof`: desfoque de fundo em px (lens blur).
- `focus`: spot ou papel em foco.
- `xfade`: crossfade em segundos, na entrada desta cena.
- `kicks`: tempos de tremida de impacto.

**`flash`:** tempos de flash branco (4 frames). Um só, logo depois do gancho.

**`sfx`:** `[{t, name, gainDb?}]`, com nomes `pop whoosh boing thud ding splash creak crash steps sparkle tick`.

**`music.mood`:** `curioso`, `animado`, `tenso` ou `calmo`.

## Cenários (spots e views)

| set | spots | views |
|---|---|---|
| palco | centro esquerda direita fundo | aberto medio close baixo |
| rua | centro esquerda direita fundo esquina | aberto medio close baixo aereo |
| casa, escritorio, laboratorio | centro esquerda direita fundo | aberto medio close baixo |
| natureza | centro esquerda direita fundo | aberto medio close baixo |
| vale (seco, rochoso, riacho, tendas; histórias antigas) | centro esquerda direita fundo riacho duelo_a duelo_b | aberto medio close baixo duelo riacho queda |

- **palco:** fundo colorido neutro, para listas e curiosidades sem lugar.
- **Cômodos:** os spots laterais ficam a ±0,95 m; no `aberto` cabem 2 a 3 pessoas.

## Ações e expressões

**Ações (todas animadas, com esqueleto articulado; nenhuma fica parada):**
`stand talk walk point wave cheer shock fall sit gesture laugh taunt struggle unhelm pick whirl topple`.
- `talk` mexe a boca e uma mão; `gesture` gesticula com as duas mãos; `laugh` gargalha com o corpo; `taunt` ameaça com a
  lança erguida.
- `struggle`: cambaleia dentro de uma armadura grande. `unhelm`: levanta o capacete e tira (1 s).
- `pick`: agacha, apanha uma pedra e levanta (1,4 s por pedra).
- `whirl`: gira a funda na mão do lado esquerdo da tela, mira com a outra e solta no `cue` (tempo absoluto).
- `topple`: no `cue`, reage ao golpe, tomba para a esquerda da tela e fica deitado, com poeira e estrelas.
- `talk` mexe a boca: use em quem está falando.
- `walk` precisa de `to`.

**Expressões:** `neutral stern grin laugh whistle nervous shock relief relief_open dazed pained smile smile_closed lick`.

## Gramática de câmera (o estilo do perfil)

- **Planos:** o `medio` e o `close` dominam; o `aberto` e o `aereo` servem para estabelecer o lugar e para mudar de
  lugar. Um plano a cada 2–4 s.
- **Reações:** a troca de expressão, o `shock` e os `kicks` caem **0–3 frames antes da palavra**, ou seja,
  `t = start da palavra − 0,05`.
- **Câmera viva:** todo plano parado é `hold` (nunca fique parado: o QA reprova trechos congelados de 12 frames ou
  mais). `punch` vai nas palavras de impacto; `kicks` nos impactos físicos (queda, batida).
- **Desfoque:** `dof` de 12–14 nos closes, 10–12 no medio, 0 nos abertos e aéreos.
- **Crossfade:** só quando muda de lugar ou de tempo (`xfade` 0,2–0,3). Dentro do mesmo lugar, corte seco.
- **Legenda:** fica na parte de baixo-centro. Os closes já enquadram o rosto acima dela; não mude o look dos closes.
