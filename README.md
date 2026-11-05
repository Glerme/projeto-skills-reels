# projeto-reels

Skill de shorts animados genéricos em pt-BR, no estilo cartoon 3D (personagens 2D "cabeça de feijão" num mundo 3D com
contorno de tinta), renderizados no HyperFrames. O objetivo é postar de 3 a 5 vídeos por semana e crescer um perfil
monetizável no Instagram, TikTok e YouTube Shorts.

O design completo está em [`docs/design.md`](docs/design.md). Ele ainda está aguardando aprovação.

## Decisões tomadas (conversa de 2026-11-04)

| Tema | Decisão |
|---|---|
| Formatos | história narrada, curiosidade, lista |
| Real ou ficção | curiosidades e listas sempre reais, com fonte; a história pode ser ficção, desde que avise |
| Aprovações | só o roteiro e o vídeo final, mais uma aprovação única do visual do kit |
| Voz | Kokoro `pm_alex`, pt-BR, de graça e rodando no PC (cerca de 3,2 palavras/s) |
| Legenda | sempre ligada, estilo "E": frase inteira em MAIÚSCULAS, branca, grossa, contorno preto, sem faixa e sem destacar palavra |
| Elenco | muda conforme o assunto, montado a partir de peças reutilizáveis guardadas num acervo |
| Kit inicial | 6 cenários: rua, casa, escritório, laboratório, natureza, palco neutro |
| Ferramentas | HyperFrames, `diretor-de-edicao` (roteiro), `media-use` (música e efeitos) |

## O que tem aqui

| Pasta | O quê |
|---|---|
| `docs/design.md` | documento do projeto: intenção, objetivos, restrições, fluxo, kit |
| `skill/` | a skill `shorts-cartoon` (link em `~/.claude/skills/shorts-cartoon`): fluxo + `references/` |
| `engine/`, `template/` | o motor 3D genérico (`npm run build` gera `lib/engine.js`) e a página HyperFrames que recebe o `video.json` |
| `scripts/mk-test-video.sh`, `scripts/snap.sh` | monta um projeto de teste a partir de um spec e tira stills dele |
| `pipeline/` | voz (`python3 -m pipeline.voice roteiro.txt voz.wav`), palavras (`pipeline.words`) e o resto do pipeline; ambiente: `scripts/setup_venv.sh` |
| `assets/voz/` | amostras das três vozes pt-BR do Kokoro. A escolhida foi `pm_alex` |
| `assets/stills-motor/` | frames renderizados pelo protótipo (3 s, 40 s, 67 s) |
| `mockups/legendas/` | os modelos de legenda mostrados na conversa e os prints. A escolhida foi a "E", em `legendas-v3.html` |

## Para rodar

**Voz:**
- Crie um venv: `python3 -m venv ~/.venvs/kokoro && ~/.venvs/kokoro/bin/pip install kokoro-onnx soundfile`.
- Instale o `espeak-ng` pelo gerenciador de pacotes do sistema.
- Os modelos ficam em `~/.cache/hyperframes/tts/`. O `hyperframes tts` baixa os dois na primeira vez que roda, mesmo
  que depois falhe.

**Motor:**
- Os modelos Kenney (CC0, Nature Kit e Fantasy Town Kit) vão em `kit/kenney/` (os `.glb` da lista `KENNEY` de
  `engine/kit.ts`, mais `Textures/colormap.png` do Fantasy Town Kit): baixe de kenney.nl. Sem eles, a cena roda, só que
  sem árvores e barracas.
- `npm run build && scripts/mk-test-video.sh engine/fixtures/two-shots.json videos/_teste-palco && scripts/snap.sh videos/_teste-palco 0.5,2.5`.

## Origem

O motor e as referências de estilo vêm do fork `~/Documentos/projetos/claude-animated-shorts`.
- Os frames de referência de lá (`references/frames`, `references/sheets`) são de outro canal: servem só para comparar
  o visual e **nunca** aparecem nos vídeos.
- Por isso, eles não foram copiados para cá.
