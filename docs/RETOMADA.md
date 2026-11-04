# Retomada: onde paramos (2026-11-04)

## Estado

O plano tem 16 tarefas (`docs/plano.md`). **As tarefas 1 a 12 estão prontas, testadas e com commit** no branch
`feat/shorts-cartoon`. A base em `main` é o commit `8878ffd`.

- O registro detalhado (ledger) de cada tarefa, todas as decisões ("Ruling") e os pontos menores adiados estão em
  `docs/ledger.md`, uma cópia do `.superpowers/sdd/plano/progress.md`, que é ignorado pelo git.
- Modo de execução atual: **inline** (`superpowers:executing-plans`). Os disparos de subagente foram bloqueados 2x pelo
  classificador do modo automático ("[Auto-Mode Bypass]"), e o usuário escolheu seguir sem subagentes.
- O usuário **aprovou o visual do kit** (Tarefa 9, folha `docs/kit/kit-v1.jpg`).

| Tarefa | O quê | Commit |
|---|---|---|
| 1 | estrutura + módulos de estilo (`engine/style/`) | 2a3f78f |
| 2 | `engine/spec.ts`: formato do video.json + validador | 285517b (+ 94d0ed0) |
| 3 | `engine/camera.ts`: receitas de câmera | fcf6848, 5cfb221 |
| 4 | personagens, ações, piscadas, 8 personagens em `kit/characters/` | 6c94cd5, 259169b |
| 5 | `engine/stage.ts` + palco + `engine/main.ts` + `template/index.html` | a1becdd, 7ccd67f, 94d0ed0 |
| 6 | cenário rua | 1fdcf33 |
| 7 | casa e escritório (`room.ts`) | 2b2b5b0 |
| 8 | laboratório e natureza | faa892b |
| 9 | ajuste do kit + aprovação | 9460ab9 |
| 10 | `pipeline/voice.py` (Kokoro pm_alex) + `pipeline/words.py` (alinhamento) | b9d0c43 |
| 11 | `pipeline/captions.py` (legenda E) | 5bad7a9 |
| 12 | `pipeline/audio/` (efeitos, trilhas por clima, mix) | ec361b2 |

## Próximos passos exatos

Continue a partir da **Tarefa 13**. Leia o texto de cada tarefa em `docs/plano.md` (seções "### Task N").

1. **Tarefa 13: `pipeline/assemble.py`.**
   - Monta `videos/<slug>/` a partir de `video.json` + `words.json` + `assets/voice.wav`.
   - Passos:
     - resolve o `cast` por id em `kit/characters/`;
     - valida com `node dist/validate.mjs` (gerado por `npm run validate:build`);
     - roda `pipeline.audio.mix.mix(...)` → `assets/mix.wav`;
     - roda `pipeline.captions.group/render_html` → `compositions/captions.html`;
     - preenche `template/index.html`: `{{SPEC}}`, `{{DURATION}}`, `{{CAPTIONS_HOST}}` com
       `pipeline.captions.host_html(dur)`, e `{{FICTION_BADGE}}` (selo "FICÇÃO" só se `fiction: true`);
     - copia `lib/engine.js`, `template/hyperframes.json` e faz o link `assets/kenney`.
   - Veja `scripts/mk-test-video.sh`: ele já faz a parte de template, link e cópia, e serve de modelo.
   - Testes do plano: `test_missing_character`, `test_fiction_badge`, `test_spec_embedded`, `test_invalid_spec_exits_1`.
2. **Tarefa 14:** `pipeline/qa.py`, a partir de `~/Documentos/projetos/claude-animated-shorts/templates/scripts/short_qa.py`,
   e `scripts/render.sh`. Decisão do pre-flight: rodar o render.sh numa cópia montada da fixture `mini` da T13, que
   tem voz.
3. **Tarefa 15:** a skill em `skill/` (`SKILL.md` + `references/{formatos,cenas,kit,armadilhas}.md`) e o link
   `~/.claude/skills/shorts-cartoon → projeto-reels/skill`.
4. **Tarefa 16:** o primeiro vídeo de ponta a ponta, com o usuário (tema + duas aprovações).
5. **Revisão final do branch.**
   - Sem subagente: faça a auto-revisão com `code-reviewer.md` do superpowers e registre no ledger
     "Final review: self-review (no subagent tool)".
   - Depois, `superpowers:finishing-a-development-branch`.
   - A mensagem final precisa listar todos os "Ruling:" e os "minor (deferred)" de `docs/ledger.md`.

## Ambiente (o que já está instalado)

**Node:**
- `npm install` já foi rodado.
- `npm test` roda 19 testes.
- `npm run typecheck`.
- `npm run build` gera `lib/engine.js`.
- `npm run validate:build` gera `dist/validate.mjs`.

**Python:**
- Venv `~/.venvs/shorts` (kokoro-onnx, soundfile, numpy, scipy, pillow), criado por `scripts/setup_venv.sh`.
- Testes: `~/.venvs/shorts/bin/python -m unittest discover pipeline/tests` (30 testes, OK).
- O Python do sistema não tem numpy.

**HyperFrames:**
- O CLI roda pelo launcher do plugin:
  `node /home/gui/.claude/plugins/cache/hyperframes/hyperframes/0.9.9/skills/hyperframes/scripts/plugin-cli.mjs <cmd>`.
- No zsh, `$HF` com espaços não se divide: use o caminho completo ou o `scripts/snap.sh`.

**Voz:**
- `python3 -m pipeline.voice roteiro.txt voz.wav`. Ele se reexecuta no venv sozinho.
- O `hyperframes tts` falha nesta máquina (espeakng_loader). Por isso usamos o espeak-ng do sistema.

**Palavras:** `~/.venvs/shorts/bin/python -m pipeline.words voz.wav roteiro.txt words.json`.

**Modelos Kenney:** ficam em `kit/kenney/` (ignorado pelo git), já baixados.

**Projetos de teste:**
- Geração: `scripts/mk-test-video.sh <spec.json> videos/_x`; stills: `scripts/snap.sh videos/_x 1,3`.
- Fixtures em `engine/fixtures/`: two-shots, rua-views, interiores, lab-natureza, kit.

## Decisões que o usuário precisa conhecer no final

Estão todas em `docs/ledger.md` (linhas com "Ruling:"). As principais:

- Execução inline em vez de subagentes, por causa dos bloqueios.
- Avaliação do kit feita pelo próprio autor.
- Balanço de caminhada de 3 % (dentro da medição da referência).
- Palco sem contorno no chão.
- Interiores:
  - casca na camada NOINK;
  - `sunAz` 130°;
  - teto sem iluminação.
- Lago estático, sem flores Kenney.
- Venv único para o pipeline.
- Legenda:
  - 2 linhas acima de 14 caracteres;
  - contorno de 0,3em;
  - closes enquadrados com o rosto acima da legenda.
- Níveis do mix: trilha −9 dB sob a voz, −3 dB a mais durante a fala, efeitos −6 dB, master −14 LUFS.
