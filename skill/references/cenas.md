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
- `set` + `light`: `day`, `golden` (fim de tarde, quente, contraluz) ou `night` (lua no lugar do sol, azul e escuro;
  nas salas, janelas com céu estrelado e teto escuro). Outro nome é recusado.
- `cam`:
  - `from`: a view inicial;
  - `recipe`:
    - `hold`: avanço lento, limitado a 8% da distância;
    - `push`: avanço lento mais forte, limitado a 12% da distância;
    - `glide`: desliza suavemente de `from` até `to` durante a cena inteira;
  - `punch`: tempos de avanço extra de 0,8 s, limitado a 3% no total, nas palavras de impacto.
  - `keys` (**padrão para vídeos novos**, `"recipe": "keys"`, sem `from`): câmera livre por chaves, para afastar,
    subir, orbitar e acompanhar dentro da mesma cena. Receitas e regras: `direcao.md`.
    Cada chave: `{t, on, dist, h, yaw, aim, fov, roll, ease}`.
    - `t`: tempo absoluto, crescente, dentro da cena. Antes da primeira chave, a câmera fica na primeira; depois da
      última, na última (com um avanço lento de ~5% no fov, para nunca congelar).
    - `on`: o alvo; é um spot, um ator da cena (seguido enquanto anda) ou um ponto `[x, y, z]`. Sem `on`, vale o
      `focus` e depois o `centro`.
    - `dist`: distância em metros (1,2–400). `h`: altura da lente sobre os pés do alvo (padrão = `aim`).
    - `aim`: altura do ponto olhado (padrão 1,35). `yaw`: graus em volta do alvo (0 = eixo do `aberto`; + = a
      câmera gira para a direita dela).
    - `fov`: 12–75 (padrão 34). `roll`: −15 a 15.
    - `ease` do movimento que chega nesta chave: `smooth` (padrão), `out` (revelação, chicote), `in`, `linear` ou
      `back` (passa um pouco e volta).
    - Os valores seguem uma curva suave, limitada às duas chaves de cada trecho (sem passar do ponto).
- `actors[]`:
  - `who`, `at` (spot), `to` (spot, só para `walk`), `path` (walkway, substitui `at`/`to`), `action`, `expr` (lista de [tempo, expressão], com tempos
    **absolutos do vídeo**, dentro da cena; o primeiro costuma ser o `start` da cena) e
    `facing` (−1, 0 ou 1);
  - `cue`: o tempo absoluto do momento-chave da ação (`whirl`, `topple`); obrigatório nessas duas.
  - `beats`: `[[tempo, ação], ...]` em tempo absoluto. A ação muda no meio da cena, misturada em 0,3 s com um
    pequeno overshoot; `action` vale até o primeiro beat. Todas as ações servem, menos `walk`.
  - `travel`: `[início, fim]` absolutos do deslocamento de `at` até `to` (padrão: a cena inteira). Dentro da janela o
    personagem anda (ou corre, se `action`/beat for `run` ou passar de 2,2 m/s), com o passo pela velocidade real;
    fora dela, faz a ação ou o beat atual.
  - `dx`/`dz`: metros a partir do spot (−8 a 8). `toDx`/`toDz`: o mesmo para o destino; sem `to`, o destino é o
    próprio `at` deslocado (para afastar ou juntar uma fila). Quem divide um spot já fica a 0,9 m um do outro.
  - `enter`/`exit`: tempos absolutos de um pop de entrada (escala com overshoot em 0,35 s e poeira nos pés) e de
    saída (encolhe em 0,25 s). Ponha um `pop` no `sfx` no mesmo tempo.
  - `hold`: objeto na mão, independente da ação: `{"L": "staff"}`. Valores: `stone staff spear helmet sling axe`.
  - até 3 atores por cena nos planos médios; numa fila ou multidão, mais, com a câmera aberta ou em travelling.
- `throws`: `[{from, to, start, end}]`. É uma pedra visível, com rastro, da mão de quem lança (mão levantada do lado
  esquerdo) até a testa do alvo, com brilho no acerto. Combine com `whirl` (`cue` = `start`) e `topple` (`cue` = `end`).
- `sky`: só em cenários com céu (`palco rua paris natureza vale`). Exemplo: `{"sun":true,"clouds":4}`.
  `sun:true` põe o disco no terço superior, do lado da luz, inclusive em `day`; `false` oculta o sol.
  `clouds` soma 0–8 nuvens (inteiro), no quadro da câmera, com posições determinísticas e sem cobrir o disco.
  Campos omitidos mantêm o comportamento anterior (sol em `golden`, nenhuma nuvem extra).
- `dof`: desfoque de fundo em px (lens blur).
- `focus`: spot ou papel em foco.
- `xfade`: crossfade em segundos, na entrada desta cena.
- `kicks`: tempos de tremida de impacto.
- `effects`: efeitos animados num spot ou num ator da cena: `[{kind, at, dx, dz, y, size, start, end, toDx, toDz}]`.
  - `fire`: chamas tremulando com brilho; `size` = altura (padrão 1,2 m).
  - `water`: poça vista de cima com ondulações; `size` = diâmetro (padrão 2,5 m).
  - `splash`: um respingo em `start` (0,8 s); `size` padrão 1,6 m.
  - `sound`: anéis de onda saindo da fonte a ~3 m/s, um a cada 0,45 s; `size` = raio máximo (padrão 4 m), `y` = altura
    da fonte (padrão 1,5 m). Com `toDx`/`toDz` a fonte anda de `start` a `end` e os anéis se apertam na frente dela
    (é o Doppler de verdade). `speed` (m/s, padrão 3) e `every` (s entre anéis, padrão 0,45): um avião precisa de
    ondas mais rápidas que ele (`speed` 30, `size` 15); um coração, `every` 0,8 e `size` 0,8. Ponha um objeto como fonte (um `mover` com o mesmo caminho, ex.: `furniture-radio` ou um
    carro).
- `movers`: modelos do kit que se deslocam na cena, em velocidade constante: `[{model, at, dx, dz, y, toDx, toDz, toY,
  start, end, turn, scale}]`. Carro na rua: ande ao longo de z dentro da pista (`dx` de −3 a 3). Avião: `y` 25–40 m
  bem atrás (`dz` −60) e câmera mirando o céu (`aim` 5). O validador não checa colisão de quem se move: confira no
  still que nada atravessa nada.

**`dressing`:** no topo do vídeo, cenário → lista de props de `kit/models.json`. Toda cena nesse cenário mostra
os mesmos objetos, nas mesmas posições. `props` por cena foi removido.
- `at` é um spot; `dx`/`dz` deslocam em metros; `turn` gira em graus; padrão 0.
- `scale` multiplica o tamanho do modelo (0,3–3; padrão 1).
- O validador mede o `.glb` local e exige 0,6 m de folga entre props e sólidos e entre props, e recusa sobreposição com spots ou calçadas:
  `dressing paris: prop 1 (stall-red) sem folga de 0,6 m com car-sedan 20: distância 0.528 m`. Modelo ausente: `não foi possível medir`.

```json
{ "dressing": { "paris": [{ "model": "lantern", "at": "fundo", "dx": -1.8, "dz": -3 }] },
  "shots": [{ "set": "paris", "actors": [
    { "who": "turista", "action": "walk", "path": "esquerda_ida" }
  ] }] }
```

**`path`:** em `rua` e `paris`, use `esquerda_ida`, `esquerda_volta`, `direita_ida` ou `direita_volta`.
Transversal: `praca` (calçada junto à torre). Em Paris, `praca_perto` faz uma volta fechada na praça,
atrás e à direita do apresentador; cabe em `aberto` e `medio` com o apresentador em `esquerda`. Todos usam tempo absoluto, sem reiniciar nos cortes.
Figurante só em calçada/praça, a pelo menos 3 m do apresentador e 12% da largura do quadro da silhueta dele.
O validador usa a câmera da cena e cita cena, figurante e instante; considera o cartão inteiro como margem segura.
Use `praca` nos planos da praça. Calçada lateral só em planos curtos ou quando desloca pelo menos 15% do quadro
em 2 s visíveis; o validador recusa `path x view` que pareça parado.
Depois de entrar, o figurante continua em todas as cenas seguintes do cenário, na mesma path, inclusive ao voltar ao cenário; precisa ficar inteiro no quadro com altura ≥ 8% por pelo menos metade de cada cena.
O figurante segue a calçada a 1,2 m/s, sem desacelerar, pelo tempo absoluto do vídeo; reaparece na outra ponta
só fora do quadro; em percurso fechado, retorna ao mesmo ponto sem salto. `ida` vai para o fundo; `volta` vem para a câmera. Começa perto dos spots, já em movimento.
- Nome errado: `path "..." não existe em paris`; combinar com `at`/`to` ou outra ação: `path exige walk e substitui at/to`.
- `at`/`to` continuam para quem fala e para deslocamentos permitidos. Se `walk` atravessar a rua:
  `walk de centro até esquina cruza a pista; figurante anda por path`.

**`overlays`:** textos na tela do formato "você inventa", com pop de entrada: `[{start, end, text, kind}]`, até 40
letras. `kind`: `dia` (etiqueta escura no topo, ex.: "DIA 1"), `termo` (palavra grande amarela com contorno, ex.:
"EMPUXO") ou `placa` (cartão branco com número, ex.: "AÇO 7,8 × ÁGUA 1"). `termo` e `placa` ficam no mesmo lugar:
não sobreponha os dois. A fonte encolhe automaticamente pelo texto para caber em 780 px (margens de 150 px),
até o máximo de 92 px (`termo`) ou 56 px (`placa`). Ponha um `pop` no `sfx` no `start`.

**`bw`:** `[[início, fim], ...]` em preto e branco (quando o vilão vence, como no formato do cofre).

**`flash`:** tempos de flash branco (4 frames). Um só, logo depois do gancho.

**`sfx`:** `[{t, name, gainDb?}]`, com nomes `pop whoosh boing thud ding splash creak crash steps sparkle tick sting`.
`sting` é o golpe de metais do twist: use junto com `music.stop`, no mesmo tempo.

**`music`:** `mood` é `curioso`, `animado`, `tenso` ou `calmo`. `stop` (opcional) corta a trilha nesse tempo e
deixa só voz e efeitos até o fim. Use no twist ou na virada final: `start` da palavra do twist − 0,05.
Exemplo: `"music": {"mood": "curioso", "stop": 31.15}`, com `{"t": 31.15, "name": "sting"}` em `sfx`.

## Cenários (spots e views)

| set | spots | views |
|---|---|---|
| palco | centro esquerda direita fundo | aberto medio close baixo |
| rua, paris | centro esquerda direita fundo esquina | aberto medio close baixo aereo |
| casa, escritorio, laboratorio | centro esquerda direita fundo | aberto medio close baixo |
| natureza | centro esquerda direita fundo | aberto medio close baixo |
| vale (seco, rochoso, riacho, tendas; histórias antigas) | centro esquerda direita fundo riacho duelo_a duelo_b | aberto medio close baixo duelo riacho queda |

- **palco:** fundo de cor chapada. **Não use**: o usuário pediu sempre um ambiente de verdade. Explicação vai para o
  laboratório, a rua, a natureza ou outro lugar real, com o fenômeno em si (`effects`, `movers`).
- **Cômodos:** os spots laterais ficam a ±0,95 m; no `aberto` cabem 2 a 3 pessoas.

## Ações e expressões

**Ações (todas animadas, com esqueleto articulado; nenhuma fica parada):**
`stand talk walk point wave cheer shock fall sit gesture laugh taunt struggle unhelm pick whirl topple run chop`.
- `chop`: levanta o machado nos 0,6 s antes do `cue` e golpeia no `cue` (tempo absoluto, obrigatório).
- `run`: corre inclinado, com os punhos alternando; o passo segue a velocidade do `travel`.
- `talk` mexe a boca e uma mão; `gesture` gesticula com as duas mãos; `laugh` gargalha com o corpo; `taunt` ameaça com a
  lança erguida.
- `struggle`: cambaleia dentro de uma armadura grande. `unhelm`: levanta o capacete e tira (1 s).
- `pick`: agacha, apanha uma pedra e levanta (1,4 s por pedra).
- `whirl`: gira a funda na mão do lado esquerdo da tela, mira com a outra e solta no `cue` (tempo absoluto).
- `topple`: no `cue`, reage ao golpe, tomba para a esquerda da tela e fica deitado, com poeira e estrelas.
- `talk` mexe a boca: use em quem está falando.
- `walk` precisa de `to` ou `path`.

**Expressões:** `neutral stern grin laugh whistle nervous shock relief relief_open dazed pained smile smile_closed lick thoughtful skeptical excited`.

## Gramática de câmera (o estilo do perfil)

A direção (o que mostrar, quando mexer, a ordem das cenas) está em `direcao.md`. Abaixo, as regras técnicas.

- **Planos:** use `keys` com movimentos contínuos dentro da cena (pull-back, grua, travelling, órbita). `hold`,
  `push` e `glide` continuam valendo, mas deixam o vídeo parado se forem o vídeo todo.
- **Reações:** a troca de expressão, o `shock` e os `kicks` caem **0–3 frames antes da palavra**, ou seja,
  `t = start da palavra − 0,05`.
- **Câmera viva:** com `keys`, o avanço lento já vem embutido. Sem `keys`, todo plano parado é `hold` (nunca fique parado: o QA reprova trechos congelados de 12 frames ou
  mais). `punch` vai nas palavras de impacto; `kicks` nos impactos físicos (queda, batida).
- **Desfoque:** `dof` de 12–14 nos closes, 10–12 no medio, 0 nos abertos e aéreos.
- **Crossfade:** só quando muda de lugar ou de tempo (`xfade` 0,2–0,3). Dentro do mesmo lugar, corte seco.
- **Continuidade:** cenas seguidas no mesmo cenário mantêm lado/eixo, direção até 15° e deslocamento transversal até 50% da menor distância, razão de distância até 2,5 e no máximo um degrau (`aberto↔medio↔close`); vale também para os extremos do glide. Em Paris, direção até 2° e deslocamento transversal até 0,2 m.
- **Legenda:** base a 484 px do fundo; o contorno fica acima do limite seguro de 460 px (craft.md 5b).
  Reserve a faixa até 676 px do fundo para duas linhas. Quem fala (`talk` ou `focus`) fica inteiro acima dela;
  o validador recusa cruzamentos durante o movimento. Em `close` de rosto e peito, o queixo também fica acima da faixa; braços e pernas podem sair do quadro.
  Altura da silhueta: `medio` 35–45%, `aberto`/`baixo` ≥18%, `close` ≥65% (antes do corte do corpo).
  Com `keys`, a regra vale quadro a quadro pelo tamanho: de 65% para cima conta como close (queixo acima da faixa);
  abaixo disso, o corpo inteiro fica acima da faixa. Só entra na regra quem faz `talk` ou é o `focus`.
  Nas quatro views, o eixo se desloca até o spot de `focus` (ator) ou do primeiro `talk`, sem mudar a direção.
- Em Paris, use o apresentador em `esquerda` e o figurante em `praca_perto`. `aberto` e `medio`
  compartilham o eixo da rua. O close prioriza rosto e peito; confira a continuidade ao cortar para ele.

**`screens`:** monitores fixos com tela animada, por cena (sem modelo externo):
`[{"at":"centro","mode":"subpixels"}]`. Repita a mesma posição nos cortes; dois itens permitem comparação lado a lado.
- `at`: spot; `dx`, `dz`, `y`: deslocamento em metros; `turn`: graus, frente em +z; `scale`: 0,3–3 (padrão 1).
  Tela local: centro `[0,1.65,0.101]`, largura 3,2 m e altura 1,8 m; monitor inteiro: altura 2,675 m.
- `mode`: `imagem` (paisagem pixelada), `subpixels` (tirinhas RGB grandes), `mistura` (R → RG → RGB, em terços
  da cena: vermelho já aceso no início, verde e azul com rampas de 0,6 s; quadrado ao lado faz o mesmo fade vermelho → amarelo → branco),
  `grade` (crossfade contínuo entre paisagem grossa e fina),
  `varredura` (faixa desce, sai por baixo e volta por fora do topo; cada linha perde brilho suavemente após o redesenho, sem reiniciar a imagem inteira), `rastro` (bola clara com contorno sobre paisagem, rastro branco), `lcd` (preto cinza de 25–35%, mais claro nas bordas)
  ou `oled` (mesma cena, preto apagado).
- `density`: colunas, inteiro 2–128 (padrão 128; em `grade`, 24). `toDensity`: destino da `grade` (padrão 128).
- `speed`: ciclos/s da `varredura`, 0,1–10 (padrão 0,5); é câmera lenta didática, não hertz reais.
- `trail:false`: bola sem rastro (padrão `true`). Animações reiniciam no `start` da cena e seguem sua duração.
  Use câmera `keys` mirando o centro da tela e `dof:0` nos detalhes. Para caber o monitor inteiro no quadro vertical com FOV 34°, mantenha cerca de 10 m ou mais. Teste dos oito modos: `videos/_teste-tela-pixels/`.

**`set: "plano"`:** ilustração 2D de frente, sem chão, sombra de chão ou perspectiva. Use `cam.keys`:
`on` desliza pelo desenho, `dist`/`fov` controlam o zoom; `yaw` e `h` não orbitam/inclinam o plano.
Nos cortes, zoom (inclui `fov`) muda no máximo 2,5×; pan até metade da menor largura do quadro. `screens` vira monitor chapado; `turn` deve ser zero e não use `dof`.
`background: {"top":"#1d3a6b","bottom":"#0b1730"}` por cena: degradê vertical (padrão azul-escuro).
Só `top` faz cor chapada. Cores em `#rrggbb`; fundo fora de `plano` é recusado. Exemplo: `videos/_teste-tela-pixels/video.json`.

## HUD de projeto (como funciona)

`captionStyle: "topo-caixa"` escolhe legenda branca no topo (duas linhas), com a maior palavra não vazia
em caixa fina com quatro pontos; omitido ou `"E"` mantém a legenda padrão embaixo. Reserve os primeiros
380 px para a legenda no topo; o validador confere quem fala nessa faixa.

`shots[].hud`: lista com `start`/`end` absolutos, dentro da cena; entrada suave de 0,25 s. Coordenadas de tela
em px no quadro 1080 × 1920. Textos até 80 letras, desenhados em maiúsculas.
- `selecao`: `{anchor, size:[largura,altura,profundidade], label, tone:"termo"|"ok"|"falha"}`;
  caixa azul fina com cantos quadrados e etiqueta amarela, verde ou vermelha.
- `seta`: `{anchor, from:[x,y]}`; sai de um ponto da tela e aponta para a peça.
- `numero`: `{position:[x,y], text:"12", label:"PARTES"}`; número amarelo grande e legenda pequena.
- `placa`: os mesmos campos de `numero`, com cartão escuro.
- `progresso`: `{position:[x,y], colors:["#ffd23a","#74e39c"]}`; bloquinhos enchem de `start` até `end`.
- `verbos`: `{position:[x,y], items:[{text:"LIGAR",t:0},{text:"MISTURAR",t:3}]}`; lista em caixa escura,
  destaca em amarelo o último item cujo `t` passou (tempos crescentes dentro do elemento).
- `cartao`: `{position:[x,y], text:"MONITOR", label:"COMO FUNCIONA"}`; título amarelo e linha pequena.

`anchor: {point:[x,y,z]}` é o centro em metros no mundo. Com `mover:0`, `point` e `size` usam os eixos locais
do primeiro `mover` da cena, na escala já aplicada ao modelo; acompanham seu deslocamento e rotação.
A projeção acompanha a câmera, sem desfoque; âncoras atrás da lente são ocultadas. Não faz teste de oclusão.
Para peças fixas do `dressing`, use o ponto do mundo correspondente. Distribua os elementos sem cobrir a peça
ou a faixa da legenda. Exemplo de todos: `videos/_teste-hud/video.json` (rádio do kit no laboratório).

**Monitor em camadas (3D):** `screens[].explode: [[tempo, valor], ...]`, valor 0–1, tempos absolutos
crescentes dentro da cena; as lâminas recuam ao longo do eixo do monitor (1,2 m cada) e sobem 0,5 m cada, em
escada, interpola suave e aceita remontagem (1 → 0). Repita o último valor no corte seguinte.
Câmera de três quartos (yaw −40° a −50°, `fov` 45): leque inteiro com `on` [0, 0,32, −1,8], `aim` 2,55,
`dist` 15; close de uma lâmina com `on` no centro dela, `dist` 7,5–8,5. Chegue ao close no primeiro 1–1,5 s.
`highlight`: `luz-de-fundo`, `polarizador-tras`, `cristal`, `filtro-cor` ou `polarizador-frente`;
ganha borda clara com brilho e mantém as outras a 40%, com fade de 0,6 s na entrada e saída. Moldura, pé e base não se movem.
`oled: [[tempo, valor], ...]` faz o fade do LCD (0) para uma única camada emissiva (1), sem luz de fundo.
`mode: "branco"` deixa a tela lisa e branca. `explode` e `oled` não servem no cenário `plano`.
HUD `selecao`/`seta`: `anchor: {screen: 0, layer: "cristal", point: [0,0,0]}` segue o centro da
camada; `point` é deslocamento local em metros, não combina com `mover`. Exemplo: `videos/_teste-explodido/video.json`.
