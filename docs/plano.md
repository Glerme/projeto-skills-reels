# Shorts cartoon genéricos: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** uma skill do Claude Code (`shorts-cartoon`) que, a partir de um tema, produz um short vertical em pt-BR no
estilo cartoon 3D da ponte, com voz Kokoro, legenda E e render no HyperFrames. O usuário só aprova o roteiro e o vídeo
final.

**Arquitetura:**
- O motor three.js da ponte vira um **motor genérico** (`engine/`), que desenha qualquer vídeo descrito por um
  `video.json` (cenas, cenário, câmera, personagens e ações, em segundos). O `video.json` vai embutido no `index.html`
  do vídeo, sem fetch.
- Os cenários (`engine/sets/`) e os personagens (`kit/characters/*.json`) formam o kit reutilizável.
- Um pipeline em Python (`pipeline/`) faz voz → palavras → legendas → som → montagem do projeto HyperFrames → QA.
- A skill (`skill/`) ensina o Claude a escrever o roteiro e o `video.json` e a rodar o pipeline.

**Tech stack:**
- three 0.187, postprocessing 6.39.6, esbuild 0.28, TypeScript 7, `node:test` (Node 22).
- Python 3.14 com numpy/scipy (som), kokoro-onnx + soundfile (voz), `unittest`.
- HyperFrames 0.9.9, pelo launcher do plugin, e ffmpeg.

**Spec:** `docs/design.md`. Leia junto com este plano. As seções citadas de `SKILL.md` são do repositório
`~/Documentos/projetos/claude-animated-shorts`.

## Restrições globais

- Raiz do projeto: `~/Documentos/projetos/projeto-reels`. Tudo fica aqui (pedido do usuário).
- HyperFrames sempre via `node /home/gui/.claude/plugins/cache/hyperframes/hyperframes/0.9.9/skills/hyperframes/scripts/plugin-cli.mjs <cmd>`.
  Neste plano está abreviado como `$HF <cmd>`. Defina `export HF="node <esse caminho>"`.
- Saída 1080x1920, 30 fps, MP4 (`$HF render --quality delivery`).
- Voz: Kokoro `pm_alex`, `lang="pt-br"`, velocidade 1.0, via `kokoro_onnx` direto com
  `EspeakConfig(lib_path="/usr/lib/libespeak-ng.so.1", data_path="/usr/share/espeak-ng-data")`, como em
  `scripts/tts_pt.py`. Nunca use `hyperframes tts`: ele falha nesta máquina.
- Transcrição: `$HF transcribe <wav> --model small --language pt --engine whisper --json`. Nunca use modelo `.en`.
- Legenda E:
  - uma frase curta por vez, toda em MAIÚSCULAS;
  - branca `#ffffff`, fonte **Archivo Black** (está no bundle do HyperFrames);
  - contorno preto grosso (`-webkit-text-stroke` + `paint-order: stroke fill`);
  - sem faixa, sem destacar palavra, centralizada, com a base do bloco a 640 px do fundo (acima dos 20% de baixo).
- Ritmo da voz: cerca de 3,2 palavras/s. Durações: história 50–70 s, curiosidade 30–45 s, lista 45–60 s.
- Mix: cerca de −14 LUFS integrado, true peak ≤ −1,2 dBTP, música abaixada 3 dB sob a fala, voz sem alteração.
- Valores visuais:
  - use os módulos de estilo **sem mudar números** (seção "Final look values" do `SKILL.md`);
  - câmera: glides smootherstep de 18–40 f, todo plano parado avança 0,15–0,35 %/f (0,6 %/f em palavras de impacto),
    kicks trocam de sinal a cada frame e decaem em 7 f, rolls de 4–4,6°;
  - personagens piscam a cada 0,5–2,3 s, durante 4 f.
- Nada de terceiros no vídeo: `references/frames` só serve para comparar. Música e efeitos são sintetizados
  (originais). Os modelos Kenney são CC0.
- Curiosidade e lista são sempre reais, com fonte no `SCRIPT.md`. História pode ser ficção (`fiction: true`), e nesse
  caso o vídeo mostra o selo "FICÇÃO".
- Idioma: pt-BR em roteiro, legenda, mensagens dos scripts e skill. Os identificadores de código ficam em inglês.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Foco de revisão

1. **O Whisper escreve números como dígitos e junta palavras** ("setenta e quatro" → "74", visto no teste). A legenda
   usa o texto do roteiro, nunca o da transcrição, e os tempos são realinhados. Teste:
   `test_align_digit_merge` (Tarefa 10).
2. **Frase ou palavra longa estourando a largura da legenda.** O agrupamento corta por número de caracteres, e uma
   palavra longa sozinha ganha um grupo só dela. Teste: `test_group_long_word` (Tarefa 11).
3. **`video.json` com buraco ou sobreposição entre cenas, ou crossfade maior que a cena.** O validador rejeita com uma
   mensagem em pt-BR. Teste: `rejects gaps, overlaps and long xfades` (Tarefa 2).
4. **Personagem ou cenário que não existe no kit.** A montagem falha dizendo qual nome falta. Teste:
   `test_missing_character` (Tarefa 13).
5. **Roteiro com dígitos ou símbolos (1831, %, R$).** O Kokoro leria mal, então a voz recusa antes de sintetizar.
   Teste: `test_check_text_flags_digits` (Tarefa 10).

---

## Estrutura de arquivos

```
projeto-reels/
  package.json, tsconfig.json      build do motor (esbuild) e testes (node:test)
  engine/
    style/                         módulos de estilo copiados, sem mudar valores
      shade.ts lights.ts paint.ts ink.ts lensblur.ts grade.ts cardshade.ts toon.ts
      build.ts                     helpers de geometria (Batch, Strand, house, prop, kitClone…), sem nada da ponte
      cards.ts                     Pool, Actor, Fx, Place, FxPlace (parte genérica de cast.ts)
    spec.ts                        tipos do video.json, validateSpec, shotAt, layersAt, flashAlpha (sem three)
    camera.ts                      camAt e receitas de câmera (sem three)
    cast/actions.ts                poseAt e blinkAt (sem three)
    cast/chars.ts                  CharDef → Outfit, drawChar
    sets/anchors.ts                spots e views de cada cenário (dados puros, usados pelo validador)
    sets/{palco,rua,casa,escritorio,laboratorio,natureza}.ts   construção de cada cenário
    sets/room.ts                   construtor de sala (casa, escritório, laboratório)
    stage.ts                       Stage: céu, luz, névoa, cenários, atores, pose por frame
    main.ts                        entrada HyperFrames: lê #video-spec, desenha no hf-seek
    validate-cli.ts                node dist/validate.mjs <video.json> (usado pelo Python)
    *.test.ts
  kit/characters/*.json            acervo de personagens (CharDef)
  kit/kenney/*.glb                 modelos CC0 (fora do git)
  template/index.html              raiz HyperFrames com marcadores de substituição
  pipeline/
    voice.py words.py captions.py assemble.py qa.py
    audio/{dsp.py,instruments.py,sfx_gen.py}   copiados de templates/audio
    audio/sfx_lib.py music.py mix.py
    tests/test_*.py
  skill/SKILL.md, skill/references/{formatos,cenas,kit,armadilhas}.md
  videos/<slug>/                   um projeto HyperFrames por vídeo (gerado)
```

Remova `prototipo-hyperframes/` na Tarefa 5, quando o motor novo substituí-lo. O `scripts/tts_pt.py` vira
`pipeline/voice.py` na Tarefa 10.

---

### Task 1: Projeto e módulos de estilo

**Arquivos:**
- Criar: `package.json`, `tsconfig.json`, `.gitignore`, `engine/style/*` (a partir de `prototipo-hyperframes/src/`),
  `engine/style/style.test.ts`.

**Interfaces:**
- Produz:
  - `engine/style/build.ts` sem import de `story`: `house(b, x, z, yaw, w, d, h, si, y = 0)`, e `buildTown` e
    `flagTex` saem (vão para a Tarefa 6).
  - `engine/style/cards.ts` exporta `Pool, Actor, Fx, Place, FxPlace, CamInfo, Stage as CardStage, SU`: é o
    `cast.ts` até a linha 224, sem `SOLDIER/BARE/FOLK`, nem nada abaixo de `export type Stage`, nem a função
    `stage()`.
  - `npm run build` gera `lib/engine.js` a partir de `engine/main.ts`.
  - `npm test` compila `engine/**/*.test.ts` com esbuild (`--platform=node`) em `.test/` e roda
    `node --test .test/`.
  - `npm run typecheck` (`tsc -p .`).

- [ ] **Passo 1:** `git init`. O `.gitignore` cobre `node_modules/ lib/ dist/ .test/ .hyperframes/ renders/ kit/kenney/ videos/*/lib/ videos/*/assets/kenney .superpowers/`.
- [ ] **Passo 2:** copie os módulos de estilo de `prototipo-hyperframes/src/` para `engine/style/`, faça os cortes
  descritos em Produz e o `package.json` com as deps do protótipo e os scripts `build`, `test`, `typecheck` e `validate:build`.
- [ ] **Passo 3:** escreva o teste `style modules import without the bridge` em `engine/style/style.test.ts`.
  - Ele importa `toon.ts` e `lights.ts` e verifica `INK === "#241726"`, `LIGHTS.day` e `LIGHTS.golden` definidos.
  - Rode `npm test`. Esperado: PASS.
- [ ] **Passo 4:** rode `npm run typecheck`. Esperado: sem erros e `grep -r "story" engine/style` vazio.
- [ ] **Passo 5:** commit `chore: projeto e módulos de estilo do motor`.

### Task 2: Spec do vídeo e validador

**Arquivos:**
- Criar: `engine/spec.ts`, `engine/sets/anchors.ts`, `engine/validate-cli.ts`, `engine/spec.test.ts`,
  `engine/fixtures/two-shots.json`.

**Interfaces:**
- Produz (sem import de three, roda em node):

```ts
export type Light = "day" | "golden";
export type SetId = "palco" | "rua" | "casa" | "escritorio" | "laboratorio" | "natureza";
export type ActionId = "stand" | "walk" | "talk" | "point" | "shock" | "cheer" | "fall" | "sit" | "wave";
export type Mood = "curioso" | "animado" | "tenso" | "calmo";
export type CharDef = { id: string; label: string; build: "adult" | "stout" | "kid" | "elder" | "slim"; outfit: Outfit; skin: number };
export type ActorSpec = { who: string; at: string; to?: string; action: ActionId; expr?: [number, Expr][]; facing?: -1 | 0 | 1 };
export type CamSpec = { recipe: "hold" | "push" | "glide"; from: string; to?: string; punch?: number[] };
export type ShotSpec = { id: number; start: number; end: number; set: SetId; light: Light; cam: CamSpec; actors: ActorSpec[];
  dof?: number; focus?: string; xfade?: number; kicks?: number[] };
export type SfxCue = { t: number; name: string; gainDb?: number };
export type VideoSpec = { version: 1; slug: string; format: "historia" | "curiosidade" | "lista"; fiction: boolean; fps: 30;
  duration: number; cast: Record<string, CharDef>; shots: ShotSpec[]; flash?: number[]; sfx: SfxCue[]; music: { mood: Mood } };
export function validateSpec(x: unknown): { ok: true; spec: VideoSpec } | { ok: false; errors: string[] };
export function shotAt(spec: VideoSpec, t: number): ShotSpec;
export function layersAt(spec: VideoSpec, t: number): { shot: ShotSpec; alpha: number }[];
export function flashAlpha(spec: VideoSpec, t: number): number;
// anchors.ts
export const ANCHORS: Record<SetId, { spots: string[]; views: string[] }>;
```

- `Outfit` e `Expr` vêm de `engine/style/toon.ts`, só como tipos (`import type`).
- Regras de `validateSpec`. As mensagens são em pt-BR e cada uma cita o `id` da cena:
  - as cenas são contíguas de 0 até `duration` (tolerância 1e-6);
  - cada cena tem ≥ 0,5 s;
  - `set`, `at`, `to`, `focus`, `cam.from` e `cam.to` existem em `ANCHORS`;
  - `who` existe em `cast`;
  - `xfade` ≤ metade da menor das duas cenas vizinhas;
  - `cam.to` é obrigatório quando `recipe` é `"glide"`;
  - os tempos de `expr`, `kicks` e `punch` ficam dentro da cena.
- `layersAt`: igual ao `layersAt` da ponte, mas em segundos. Durante `[start − xfade/2, start + xfade/2)` da cena N,
  devolve `[N−1 com alpha 1, N com alpha linear 0→1]`.
- `flashAlpha`: nos 4 frames seguintes a cada tempo em `flash`, vale `[1, .75, .45, .2]`. Fora disso, 0.
- `validate-cli.ts`: lê o arquivo e imprime `ok` ou um erro por linha. Exit 0 ou 1. É gerado em `dist/validate.mjs`
  pelo script `npm run validate:build`.

- [ ] **Passo 1:** escreva os testes em `engine/spec.test.ts`.
  - `accepts the two-shot fixture`;
  - `rejects gaps, overlaps and long xfades`: três variações da fixture, e cada uma tem um erro contendo `"cena 2"`;
  - `rejects unknown set, spot and character`;
  - `layersAt crossfades linearly`: na metade do xfade, `alpha ≈ 0.5`;
  - `flashAlpha follows 1/.75/.45/.2`.
- [ ] **Passo 2:** rode `npm test`. Esperado: FAIL, porque o módulo ainda não existe.
- [ ] **Passo 3:** implemente `spec.ts`, `anchors.ts` (spots e views dos 6 cenários, os nomes que as Tarefas 5–8
  vão usar) e `validate-cli.ts`.
  - Spots mínimos por cenário: `centro, esquerda, direita, fundo`.
  - Views mínimas: `aberto, medio, close, baixo`.
  - A `rua` tem ainda `esquina` e `aereo`.
- [ ] **Passo 4:** rode `npm test`. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: spec do vídeo e validador`.

### Task 3: Câmera

**Arquivos:**
- Criar: `engine/camera.ts`, `engine/camera.test.ts`.

**Interfaces:**
- Consome: `ShotSpec` (Tarefa 2).
- Produz:
  - `export type V3 = [number, number, number]`;
  - `export type Cam = { pos: V3; look: V3; fov: number; roll: number }`;
  - `export function camAt(shot: ShotSpec, t: number, views: Record<string, Cam>, fps = 30): Cam`.
- Receitas (frames contados a partir de `shot.start`):
  - `hold`: a view `from` com avanço contínuo de 0,25 %/f da distância até `look`;
  - `push`: igual, a 0,6 %/f;
  - `glide`: smootherstep (`x³(x(6x−15)+10)`) de `from` até `to`, em `clamp(dur, 18, 40)` frames, e depois um `hold`
    na view `to`;
  - `punch`: em cada tempo listado, o avanço sobe para 0,6 %/f por 6 f;
  - `kicks`: em cada tempo, um deslocamento lateral e de roll que troca de sinal a cada frame, com amplitude caindo
    linearmente até 0 em 7 f.

- [ ] **Passo 1:** escreva os testes.
  - `hold never freezes`: dois frames vizinhos diferem em `pos`, em qualquer frame da cena;
  - `glide lands on target`: `camAt` no frame `start + 40/30` é igual à view `to`, com tolerância 1e-6;
  - `kick flips sign and dies in 7 frames`: os sinais alternam nos frames 0–6 e o frame 7 é igual ao sem kick;
  - `push is faster than hold`.
- [ ] **Passo 2:** rode `npm test`. Esperado: FAIL.
- [ ] **Passo 3:** implemente `camera.ts`.
- [ ] **Passo 4:** rode `npm test`. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: receitas de câmera`.

### Task 4: Personagens, ações e acervo inicial

**Arquivos:**
- Criar: `engine/cast/actions.ts`, `engine/cast/chars.ts`, `engine/cast/actions.test.ts`, `kit/characters/*.json`
  (8 personagens).
- Modificar: `engine/style/toon.ts`, no `BUILD`: adicionar `elder` (mesma `a`, torso 1.05, pernas 1.3, tw 0.82,
  costas inclinadas 4°) e `slim` (tw 0.7).

**Interfaces:**
- Consome: `ActionId`, `CharDef` (Tarefa 2); `FrontOpts`, `bodyFront`, `Pen`, `Outfit` (`toon.ts`).
- Produz:
  - `export function poseAt(action: ActionId, t: number, seed: number): FrontOpts` (sem three);
  - `export function blinkAt(seed: number, t: number, fps = 30): boolean`;
  - `export function drawChar(p: Pen, c: CharDef, pose: FrontOpts): void`;
  - `export function loadCharacters(dir: string): Record<string, CharDef>` (node, só nos testes; o Python lê os
    JSON direto).
- Ações:
  - `walk`: `mode: "stroll"`, balanço 5 %, inclinação 1–7°, passada de 0,8 m (o `Stage` desloca de `at` para `to`);
  - `talk`: alterna a boca a cada 4–6 f;
  - `point`, `wave`, `cheer`: braços;
  - `shock`: `expr` `shock` + `lift`;
  - `fall`: `mode: "fall"`;
  - `sit`: `mode: "sit"`;
  - `stand`: respiração de ±1 %.
- Acervo inicial (`id`): `homem`, `mulher`, `crianca`, `idoso`, `cientista` (jaleco branco), `executivo` (terno),
  `operario` (macacão e capacete), `medico`. Cada um tem um `label` em pt-BR.

- [ ] **Passo 1:** escreva os testes.
  - `poseAt is deterministic`;
  - `blinks every 0.5–2.3 s for 4 frames`: em 60 s, todos os intervalos entre piscadas estão em [0,5; 2,3] s e cada
    piscada dura 4 frames;
  - `every kit character validates`: `loadCharacters("kit/characters")` passa pelo `validateSpec` de uma fixture que
    usa todos.
- [ ] **Passo 2:** rode `npm test`. Esperado: FAIL.
- [ ] **Passo 3:** implemente e crie os 8 JSON.
- [ ] **Passo 4:** rode `npm test`. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: ações, piscadas e acervo inicial de personagens`.

### Task 5: Stage genérico, palco neutro e entrada HyperFrames

**Arquivos:**
- Criar: `engine/stage.ts`, `engine/sets/types.ts`, `engine/sets/palco.ts`, `engine/main.ts`, `template/index.html`,
  `scripts/snap.sh`.
- Remover: `prototipo-hyperframes/`.

**Interfaces:**
- Consome: Tarefas 1–4.
- Produz:
  - `SetDef = { id: SetId; sky: boolean; views: Record<string, Cam>; spots: Record<string, V3>; build(root: THREE.Group, kit: Kit): void; look?: Partial<WorldLook> }`;
  - `SETS: Record<SetId, SetDef>`, em `engine/sets/index.ts`;
  - `class Stage { root: THREE.Group; constructor(kit: Kit, spec: VideoSpec); update(shot: ShotSpec, t: number, cam: THREE.PerspectiveCamera): THREE.Vector3 }`.
    O `update` devolve o ponto de foco e só mostra o grupo do cenário da cena.
- `Stage` é o `World` de `world.ts` sem nada da ponte. Ficam:
  - céu de 5 faixas, sol congelado por cena e relativo à câmera, disco e halo do sol, nuvens, névoa com a cor do
    horizonte, hemi, sol e fill de `LIGHTS`;
  - atores do `Pool`, com `drawChar` e `poseAt`, piscadas e sombra de contato;
  - corte por linha de visão.
- O `palco` é um chão infinito de uma cor, um fundo ciclorama colorido e um degradê de céu sem horizonte, para listas e
  curiosidades.
- `main.ts` é o `prototipo-hyperframes/src/main.ts` com estas mudanças:
  - o spec vem de `JSON.parse(document.getElementById("video-spec").textContent)`;
  - tudo em segundos, via `layersAt`, `flashAlpha` e `camAt`;
  - o DOF vem de `shot.dof` (cInf px em 1080), com foco no spot `shot.focus` ou no `look`;
  - o grade vem de `shot.light`.
- `template/index.html` é o `prototipo-hyperframes/index.html` com estas mudanças:
  - `data-duration="{{DURATION}}"`;
  - `<script type="application/json" id="video-spec">{{SPEC}}</script>`;
  - o host de legendas `{{CAPTIONS_HOST}}`;
  - o `<audio id="mix">`;
  - o selo `{{FICTION_BADGE}}`;
  - o script `lib/engine.js`.
- `scripts/snap.sh <dir> <t1,t2,…>`: roda `$HF snapshot --at` e imprime os caminhos dos PNG.

- [ ] **Passo 1:** baixe de kenney.nl (CC0) o Nature Kit e o Fantasy Town Kit em `kit/kenney/`, com os nomes da
  lista `KENNEY` de `world.ts`.
  - Esperado: `ls kit/kenney/*.glb | wc -l` ≥ 26.
- [ ] **Passo 2:** implemente `stage.ts`, `palco.ts`, `main.ts` e o template.
- [ ] **Passo 3:** monte à mão `videos/_teste-palco/` a partir da fixture de duas cenas (palco, `homem` em `talk` e
  `mulher` em `point`).
  - Rode `npm run build && $HF check --json`. Esperado: `runtime.errorCount` 0.
  - Rode `scripts/snap.sh videos/_teste-palco 0.5,2.5`.
- [ ] **Passo 4:** leia os PNG.
  - Esperado: os dois personagens têm contorno ameixa, o chão tem contorno preto e o fundo é colorido.
  - Os desvios-padrão de luma (`python -c` com PIL) são > 0,05, ou seja, o frame não está liso.
- [ ] **Passo 5:** commit `feat: stage genérico, palco neutro e entrada HyperFrames`.

### Task 6: Cenário rua

**Arquivos:**
- Criar: `engine/sets/rua.ts`, com o `buildTown` e o `flagTex` tirados do `build.ts` original e adaptados.

**Interfaces:**
- Consome: `SetDef` (Tarefa 5) e os helpers de `engine/style/build.ts`.
- Produz: `SETS.rua`.
- A rua:
  - tem calçadas de pedra (`cobbleHD`) e duas fileiras de `house`;
  - usa as alturas 7 / 8,4 / 9,8 m e as cores de tijolo, creme, ocre e terracota de "Final look values";
  - tem props Kenney (árvores, barracas, lanterna, carroça);
  - tem os spots e views de `ANCHORS.rua`;
  - não tem bandeira de país: o flag sai.

- [ ] **Passo 1:** implemente e monte `videos/_teste-rua` com 4 cenas, uma por view, uma em luz `golden`.
- [ ] **Passo 2:** rode `$HF check` e o snapshot.
  - Confira pela seção "Readability traps" do `SKILL.md`: nenhum prop a menos de 2 m da lente e nenhuma câmera dentro
    de casa.
- [ ] **Passo 3:** commit `feat: cenário rua`.

### Task 7: Casa e escritório (interiores)

**Arquivos:**
- Criar: `engine/sets/room.ts`, `engine/sets/casa.ts`, `engine/sets/escritorio.ts`.

**Interfaces:**
- Produz:
  - `buildRoom(root, o: { w: number; d: number; h: number; wall: string; floor: "planks" | "tiles"; windows: number }): void`;
  - `SETS.casa` (sofá, mesa, estante, janela com céu);
  - `SETS.escritorio` (mesas com monitor, cadeiras, quadro, planta).
- Interiores usam `sky: false`. A luz vem da janela, com o preset `day` e o sol entrando pela janela.
- Os móveis são caixas do `Batch` com `twoTone` e texturas pintadas. Mesmo contorno, mesmas regras de albedo (nunca
  limão, nunca lavanda).

- [ ] **Passo 1:** implemente `room.ts` e os dois cenários e monte `videos/_teste-interiores`.
- [ ] **Passo 2:** rode `$HF check` e o snapshot. Esperado: a parede não fica crua (p5 de luma fora da tinta ~0,23,
  medido com PIL) e o contorno aparece nas quinas dos móveis, mas não na junção parede/chão.
- [ ] **Passo 3:** commit `feat: cenários casa e escritório`.

### Task 8: Laboratório e natureza

**Arquivos:**
- Criar: `engine/sets/laboratorio.ts` (usa `buildRoom`: bancadas, vidraria com emissivo leve, quadro de fórmulas sem
  texto legível), `engine/sets/natureza.ts` (campo com `grassHD`, árvores Kenney, lago com `waterNear`/`waterFar`,
  colinas ao fundo na névoa).

- [ ] **Passo 1:** implemente e monte `videos/_teste-lab-natureza`.
- [ ] **Passo 2:** rode `$HF check` e o snapshot.
  - Só os emissivos têm bloom (threshold 1.0).
  - Os planos abertos de natureza ficam nítidos (`dof` 0).
- [ ] **Passo 3:** commit `feat: cenários laboratório e natureza`.

### Task 9: Ajuste e aprovação única do kit

**Arquivos:**
- Criar: `videos/_kit/` (uma cena por cenário × luz, mais um "line-up" com os 8 personagens no palco) e
  `docs/kit-review.md`.

- [ ] **Passo 1:** renderize os stills do `_kit`.
- [ ] **Passo 2:** compare com os frames de `references/frames/` usando `templates/scripts/sbs_sheet.py` do
  repositório da ponte. Faça uma rodada do "Look-match loop" do `SKILL.md`: um verificador Opus dá nota por área e uma
  lista de correções.
  - Corrija até cada área ficar ≥ as notas finais da ponte: cor day 7, iluminação 5, ink 6, texturas 5,
    personagens 7, profundidade 6, composição 6.
  - Registre as notas em `docs/kit-review.md`.
- [ ] **Passo 3: aprovação do usuário.** Mostre a folha de stills (cenários + line-up) e espere o "aprovado". Esta é
  a única aprovação do kit (spec). Se ele pedir mudança, volte ao Passo 2 só na área pedida.
- [ ] **Passo 4:** commit `feat: kit inicial aprovado`.

### Task 10: Voz e palavras

**Arquivos:**
- Criar: `pipeline/voice.py` (a partir de `scripts/tts_pt.py`), `pipeline/words.py`, `pipeline/tests/test_voice.py`,
  `pipeline/tests/test_words.py`, `scripts/setup_kokoro.sh`.
- Remover: `scripts/tts_pt.py`.

**Interfaces:**
- `voice.py`:
  - `check_text(text: str) -> list[str]` devolve problemas em pt-BR. Recusa dígitos, `%`, `R$`, `&`, `/`, `+` e
    URLs;
  - `synth(text: str, out: Path, voice: str = "pm_alex") -> float` devolve a duração em segundos e levanta
    `ValueError` se `check_text` não estiver vazio;
  - CLI: `python -m pipeline.voice <roteiro.txt> <saida.wav>`.
- `words.py`:
  - `Word = TypedDict("Word", {"id": str, "text": str, "start": float, "end": float})`;
  - `transcribe(wav: Path) -> list[Word]` (chama `$HF transcribe` com as flags das Restrições);
  - `align(script: str, heard: list[Word]) -> list[Word]`: o texto é sempre o do roteiro. Usa
    `difflib.SequenceMatcher` sobre palavras normalizadas (minúsculas, sem acento nem pontuação). Palavras do roteiro
    sem par herdam o intervalo do trecho ouvido correspondente, dividido proporcionalmente aos caracteres. Os tempos
    ficam monotônicos;
  - `drop_silent_tail(words: list[Word], wav: Path) -> list[Word]` usa `silencedetect=noise=-35dB:d=0.6`;
  - CLI: `python -m pipeline.words <voz.wav> <roteiro.txt> <words.json>`.
- `setup_kokoro.sh` cria `~/.venvs/kokoro` com `kokoro-onnx soundfile` se ele não existir. O `voice.py` se
  reexecuta com esse python se `kokoro_onnx` não importar.

- [ ] **Passo 1:** escreva os testes.
  - `test_check_text_flags_digits`: `"Em 1831, 50% caiu"` dá ≥ 2 problemas; `"Em mil oitocentos e trinta e um"`
    dá `[]`;
  - `test_align_digit_merge`: roteiro `"setenta e quatro soldados marcharam"`, ouvido
    `[74 (0.0–0.8), soldados (0.8–1.4), marcharam (1.4–2.0)]`. O resultado tem 5 palavras com o texto do roteiro, a
    primeira começa em 0,0, "e" e "quatro" ficam dentro de 0,0–0,8 e os tempos crescem;
  - `test_align_identity`: textos iguais mantêm os tempos;
  - `test_synth_alex` (pulado se o venv não existir): uma frase curta gera wav de 24 kHz com duração > 0,5 s.
- [ ] **Passo 2:** rode `python -m unittest discover pipeline/tests`. Esperado: FAIL.
- [ ] **Passo 3:** implemente.
- [ ] **Passo 4:** rode `python -m unittest discover pipeline/tests`. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: voz Kokoro e alinhamento de palavras`.

### Task 11: Legendas

**Arquivos:**
- Criar: `pipeline/captions.py`, `pipeline/tests/test_captions.py`.

**Interfaces:**
- Consome: `Word` (Tarefa 10).
- Produz:
  - `Group = TypedDict("Group", {"text": str, "start": float, "end": float})`;
  - `group(words: list[Word], max_words: int = 5, max_chars: int = 26, pause: float = 0.15) -> list[Group]`:
    - corta no fim de frase (`.`, `!`, `?`, `:`), numa pausa ≥ `pause` ou no limite;
    - uma palavra maior que `max_chars` fica sozinha;
    - o texto vai em `upper()` e sem a pontuação final;
    - o primeiro grupo começa ≥ 0,1 s;
    - os grupos não se sobrepõem;
  - `render_html(groups: list[Group], out: Path) -> None` escreve `compositions/captions.html`, uma sub-composição
    no formato de `references/captions.md` do HyperFrames:
    - host com `data-track-kind="captions"`, um `<div class="clip">` com `id` por grupo;
    - `fitTextFontSize` (base 78, mínimo 42, `maxWidth` 900);
    - hard kill em cada fim;
    - o estilo das Restrições (Archivo Black, contorno, base a 640 px do fundo).

- [ ] **Passo 1:** escreva os testes.
  - `test_group_sentence_break`;
  - `test_group_pause_break`;
  - `test_group_long_word`: `"anticonstitucionalissimamente"` fica sozinha;
  - `test_upper_accents`: `"ação já"` vira `"AÇÃO JÁ"`;
  - `test_first_starts_after_100ms`;
  - `test_html_has_kill_and_host`: o HTML contém `data-track-kind="captions"` e, para cada grupo, um
    `visibility: "hidden"` no fim.
- [ ] **Passo 2:** rode os testes. Esperado: FAIL.
- [ ] **Passo 3:** implemente.
- [ ] **Passo 4:** rode os testes. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: legendas estilo E`.

### Task 12: Som

**Arquivos:**
- Copiar: `templates/audio/{dsp.py,instruments.py,sfx_gen.py}` do repositório da ponte para `pipeline/audio/`.
- Criar: `pipeline/audio/sfx_lib.py`, `pipeline/audio/music.py`, `pipeline/audio/mix.py`,
  `pipeline/tests/test_audio.py`.

**Interfaces:**
- `sfx_lib.SFX: dict[str, Callable[[np.random.Generator], np.ndarray]]`, com os nomes `pop, whoosh, boing, thud, ding,
  splash, creak, crash, steps, sparkle, tick`. São estéreo, 48 kHz, feitos com as funções de `sfx_gen` e `dsp`.
- `music.bed(mood: Mood, dur: float, seed: int) -> np.ndarray`: estéreo, 48 kHz, original, com instrumentos de
  `instruments.py`.
  - Cada humor tem um andamento: `curioso` 100 bpm (pizzicato e glock), `animado` 120 bpm (metais e percussão),
    `tenso` 80 bpm (graves e pulsação), `calmo` 72 bpm (pad e sinos).
  - Fade de 1 s no fim.
- `mix.mix(voice: Path, words: list[Word], sfx: list[SfxCue], mood: Mood, dur: float, out: Path) -> dict`:
  - devolve `{"lufs": float, "true_peak": float}`;
  - voz sem alteração, música abaixada 3 dB enquanto `words` fala, alvo −14 LUFS, limitador em −1,2 dBTP;
  - grava `mix.wav` com exatamente `round(dur*48000)` amostras;
  - levanta `KeyError` com o nome se um efeito não existir.

- [ ] **Passo 1:** escreva os testes.
  - `test_mix_exact_length`;
  - `test_mix_loudness`: −14 ± 1 LUFS, true peak ≤ −1,2;
  - `test_duck_under_speech`: a música fica ≥ 2,5 dB mais baixa nos trechos de fala;
  - `test_unknown_sfx`;
  - `test_every_sfx_renders`: todo `SFX` gera áudio não silencioso e finito.
- [ ] **Passo 2:** rode os testes. Esperado: FAIL.
- [ ] **Passo 3:** implemente.
- [ ] **Passo 4:** rode os testes. Esperado: PASS.
- [ ] **Passo 5:** commit `feat: efeitos, trilhas originais e mix`.

### Task 13: Montagem do projeto do vídeo

**Arquivos:**
- Criar: `pipeline/assemble.py`, `pipeline/tests/test_assemble.py`, `pipeline/tests/fixtures/mini/` (`video.json`,
  `words.json`, voz curta).

**Interfaces:**
- Consome: `dist/validate.mjs` (Tarefa 2), `captions.group/render_html` (Tarefa 11), `mix.mix` (Tarefa 12) e
  `kit/characters` (Tarefa 4).
- Produz `assemble(video_dir: Path) -> Path` (devolve `index.html`). Ele:
  1. lê `video.json`. Quando um valor de `cast` é uma string, ela é o id de um personagem do acervo e é trocada pelo
     `CharDef` correspondente. Um id ausente levanta `SystemExit("personagem não está no kit: <id>")`;
  2. valida com `node dist/validate.mjs`. Se falhar, mostra os erros e sai com código 1;
  3. gera `assets/mix.wav`, `compositions/captions.html` e `index.html` a partir do template:
     - `{{FICTION_BADGE}}` é um selo "FICÇÃO" no canto superior (Archivo Black, 34 px, branco com contorno), presente
       só se `fiction`;
  4. copia `lib/engine.js` e cria o link `assets/kenney → kit/kenney`.
- CLI: `python -m pipeline.assemble videos/<slug>`.

- [ ] **Passo 1:** escreva os testes.
  - `test_missing_character`;
  - `test_fiction_badge` (presente com `fiction: true`, ausente com `false`);
  - `test_spec_embedded`: o JSON dentro de `#video-spec` é igual ao spec resolvido;
  - `test_invalid_spec_exits_1`.
- [ ] **Passo 2:** rode os testes. Esperado: FAIL.
- [ ] **Passo 3:** implemente.
- [ ] **Passo 4:** rode os testes. Esperado: PASS. Depois rode `$HF check --json` na fixture montada. Esperado: lint e
  runtime sem erros.
- [ ] **Passo 5:** commit `feat: montagem do projeto HyperFrames do vídeo`.

### Task 14: QA e render

**Arquivos:**
- Criar: `pipeline/qa.py` (a partir de `templates/scripts/short_qa.py`, com os limites de cena tirados do
  `video.json`), `scripts/render.sh`.

**Interfaces:**
- `qa.run(video_dir: Path) -> list[str]` devolve os problemas: frames pretos ou brancos fora dos flashes, trechos
  congelados ≥ 12 f, pulos fora de cortes e loudness fora de −14 ± 1,5.
- `scripts/render.sh videos/<slug>` roda:
  1. `npm run build`;
  2. `python -m pipeline.assemble`;
  3. `$HF check`;
  4. `$HF render --quality delivery --output videos/<slug>/final.mp4`;
  5. `python -m pipeline.qa`.
  Ele para no primeiro erro.

- [ ] **Passo 1:** escreva o teste `test_qa_flags_frozen`. Um mp4 sintético do ffmpeg, com 2 s de cor e 1 s parado,
  é reportado como congelado.
- [ ] **Passo 2:** implemente e rode os testes. Esperado: PASS.
- [ ] **Passo 3:** rode `scripts/render.sh videos/_teste-palco`. Esperado: `final.mp4` 1080x1920 30 fps com áudio e
  QA sem problemas.
- [ ] **Passo 4:** commit `feat: QA e render`.

### Task 15: A skill

**Arquivos:**
- Criar: `skill/SKILL.md`, `skill/references/formatos.md`, `skill/references/cenas.md`, `skill/references/kit.md`,
  `skill/references/armadilhas.md`.
- Link: `~/.claude/skills/shorts-cartoon → projeto-reels/skill`.

**Conteúdo fixado pela spec:**
- `SKILL.md`, com frontmatter `name: shorts-cartoon` e uma descrição pt-BR com gatilhos ("faz um short/reel sobre…",
  "vídeo animado de curiosidade/lista/história"). Ele contém:
  - o fluxo de 10 passos de `docs/design.md`, com as **duas** aprovações;
  - o uso de `diretor-de-edicao` (`roteiro.md`, `retencao.md`, `narracao.md`) para gancho e retenção, com o aviso de
    que a transcrição dele (mlx-whisper) não roda aqui e que se usa `pipeline/words.py`;
  - o comando de cada passo;
  - o que refazer depois de um "não" na aprovação final, conferindo `$HF history --since mine` antes de regerar;
  - o limite de no máximo um agente revisor de stills por vídeo e no máximo uma peça nova de kit por vídeo.
- `formatos.md`: a fórmula de cada formato (a de história vem do passo 2 do `SKILL.md` em pt-BR), as durações, cerca de
  190 palavras por minuto, números por extenso, a regra real/ficção e as fontes no `SCRIPT.md`.
- `cenas.md`: como escrever o `video.json` (o schema da Tarefa 2), os spots e views de cada cenário, as ações, as
  receitas de câmera, as reações 0–3 frames antes da palavra (usando `words.json`), o DOF por tipo de plano ("Final
  look values"/"Lens") e os crossfades só em mudança de lugar ou de tempo.
- `kit.md`: o acervo, como adicionar um personagem (JSON) ou um cenário (`SetDef` + `ANCHORS`) e o critério de
  "genérico" para algo entrar no acervo.
- `armadilhas.md`: a seção "Readability traps" do `SKILL.md`, traduzida.

- [ ] **Passo 1:** escreva os arquivos e crie o link.
- [ ] **Passo 2:** abra uma sessão nova e confira que a skill aparece na lista com a descrição em pt-BR.
- [ ] **Passo 3:** commit `feat: skill shorts-cartoon`.

### Task 16: Primeiro vídeo de ponta a ponta

- [ ] **Passo 1:** em sessão nova, peça "faz um short de curiosidade sobre <tema escolhido pelo usuário>" e siga só a
  skill.
- [ ] **Passo 2:** o usuário aprova o roteiro.
- [ ] **Passo 3:** a skill entrega `videos/<slug>/final.mp4`.
  - Confira: duração de 30–45 s, legenda E durante toda a fala, voz Alex, QA limpo e nenhum frame de referência ou
    material de terceiros.
- [ ] **Passo 4:** o usuário aprova o vídeo final. Anote em `docs/kit-review.md` o que o fluxo deixou a desejar.
- [ ] **Passo 5:** commit `docs: primeiro vídeo e ajustes`.
