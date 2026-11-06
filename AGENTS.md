# projeto-reels — como trabalhar aqui (coordenador e workers)

Shorts animados verticais em pt-BR (TikTok, Reels, Shorts), no estilo cartoon do perfil: personagens 2D "cabeça de
feijão" num mundo 3D com contorno de tinta, renderizados no HyperFrames. Meta: 3 a 5 vídeos por semana.
Visão geral e pastas: `README.md`. Este arquivo é a única fonte das regras (o `CLAUDE.md` só aponta para cá).

- **Coordenador** (a sessão principal, que fala com o usuário): leia as seções 1 a 6.
- **Worker** (chamado por `scripts/worker.sh <papel> videos/<slug> "<nota>"`): o seu pedido está em
  `skill/agentes/<papel>.md` e na nota. Leia as seções 7 e 8, e a 5 e a 6 quando tocarem o seu papel.

## 1. Você é o coordenador (o projeto roda no Orca)

- As sessões rodam **dentro do Orca** (`env | grep ORCA_` mostra as variáveis). Não suponha o contrário: use o
  **modo orquestrado** (`skill/references/orquestrado.md`) por padrão.
- O coordenador fala com o usuário, conduz as aprovações e dispara os workers. Ele **não escreve** roteiro,
  `video.json` nem código do motor, **não lê `engine/`** e **não abre stills**. Lê só a saída `.txt` de cada worker.
  Exceção: peça nova (cenário ou personagem), em que ele olha uma vez uma folha de stills lado a lado antes de aprovar.
- Fazer tudo na sessão principal gasta muito mais. Só faça assim se o usuário pedir.

## 2. As skills e quem manda

| Skill | Para quê | Quem usa |
|---|---|---|
| `shorts-cartoon` (`skill/`, link em `~/.claude/skills/shorts-cartoon`) | o fluxo do vídeo, do tema ao `final.mp4` | coordenador |
| `diretor-de-edicao` | gancho, roteiro, retenção, ritmo de edição, pesquisa de referências | roteirista, diretor, coordenador (intake) |
| `motion-designer` (`references/craft.md`) | composição, movimento, zonas seguras, leitura | roteirista, diretor, revisor |
| `hyperframes`, `hyperframes-cli` | render, check, preview | scripts (`render.sh`) |
| `media-use` | música e efeitos | `pipeline/audio` (sintetizados) |

Todo vídeo usa `diretor-de-edicao` e `motion-designer`. Em conflito, **essas duas mandam** em ritmo, roteiro,
edição e movimento. O motor só limita o que existe tecnicamente (ações, peças, cenários).

## 3. O fluxo de um vídeo e o agente de cada passo

O usuário decide em **três pontos**: aprova o roteiro, confirma o briefing visual e aprova o vídeo final. Fora
deles, decida e anote; não pergunte.

| Passo | Quem faz | Comando ou onde |
|---|---|---|
| 0. Pesquisa de referência (quando o usuário manda perfis) | coordenador | ver §5 |
| 1–2. Tema, formato, pesquisa e roteiro | **roteirista** (Claude Opus) | `bash scripts/worker.sh roteirista videos/<slug> "tema: …; formato: …"` |
| 3. Aprovação 1: roteiro | coordenador + usuário | mostre a tabela de `agentes/roteirista.txt` e o `roteiro.txt` |
| 4. Briefing visual | coordenador + usuário | parta da "Briefing visual (sugestão)" do `SCRIPT.md`; pergunte só o que está em aberto (no máximo 4 perguntas); grave a versão confirmada |
| Peça nova (cenário) | **cenógrafo** (Codex) → **revisor** (Haiku) | `worker.sh cenografo …`, depois `worker.sh revisor videos/_teste-<id> …` |
| Recurso novo no motor (ação, objeto de mão, campo do `video.json`) | **motor** (Codex) | escreva o pedido num arquivo e rode `worker.sh motor videos/<slug> "Pedido em <arquivo>"`; confira com `npm test` |
| 5. Voz e palavras | script | `python3 -m pipeline.voice videos/<slug>/roteiro.txt videos/<slug>/assets/voice.wav` e `~/.venvs/shorts/bin/python -m pipeline.words videos/<slug>/assets/voice.wav videos/<slug>/roteiro.txt videos/<slug>/words.json` |
| 6. Plano de cenas (`video.json`) | **diretor** (Codex) | `worker.sh diretor videos/<slug>` |
| 7. Render + QA | script | `bash scripts/render.sh videos/<slug> > videos/<slug>/agentes/render.log 2>&1` (um render por vez) |
| 7b. Render falhou | **corretor** (Codex) | `worker.sh corretor videos/<slug>`; no máximo 3 voltas |
| 8. Revisão dos stills | **revisor** (Claude Haiku) | `worker.sh revisor videos/<slug> "<o que é intencional>"`; se "RESULTADO: corrigir", mande a lista ao diretor como nota |
| 8b. Nota de retenção | coordenador | `skill/references/nota.md`, lendo só `qa/report.md`, `roteiro.txt` e `SCRIPT.md` |
| 9. Aprovação 2: vídeo final | coordenador + usuário | entregue `videos/<slug>/final.mp4` + a nota; ofereça `npx hyperframes preview` na pasta |

Cada worker numa aba do Orca, para o usuário acompanhar:

```
orca terminal create --worktree active --title "<slug>:<papel>" \
  --command 'bash scripts/worker.sh <papel> videos/<slug> "<nota>"; exit' --json
orca terminal wait --terminal <handle> --for exit --timeout-ms 1800000 --json
cat videos/<slug>/agentes/<papel>.txt
```

- Se o diretor errar o mesmo ponto duas vezes, rode o passo com Claude Opus no lugar do Codex.
- O revisor acha um problema novo a cada volta: pare em 3 voltas e decida.
- O revisor Haiku é bom para regras, fraco para "isto parece o que deveria?". Na peça nova, o coordenador confere a
  folha de stills.
- Quando o vídeo usa um recurso novo (ex.: `overlays`, `bw`), diga na nota do revisor que ele é intencional.

**Mudança pedida no vídeo final:** roteiro ou fala → passo 5; visual de cenário ou personagem → passo 4 e depois o 6;
cena, câmera ou animação → passo 6; só som ou legenda → passo 7. Antes de regerar, rode
`npx hyperframes history --since mine` na pasta: se o usuário editou no app desktop, regerar sobrescreve.

## 4. Formatos (detalhes em `skill/references/formatos.md`)

| Formato | Duração | Marca |
|---|---|---|
| história / série em partes | 50–70 s por parte | ficção leva `"fiction": true` e selo FICÇÃO |
| curiosidade | 30–45 s | sempre real, com fonte |
| lista | 45–60 s | itens do menos para o mais surpreendente |
| e se | 15–25 s | segunda pessoa, presente |
| e se — série | **no máximo 60 s** por parte | personagem fixo com nome, "Aí deu ruim.", cliffhanger (base: @rmhkaiser) |
| você inventa | ~90 s (pedido do usuário) | vilão fixo, "Dia um… Dia sete", `overlays` + `bw`, "Parabéns. Você construiu…" (base: @explicamostudo). Exemplo: `videos/navio-flutua` |

## 5. O que o usuário já decidiu (não pergunte de novo)

- **Voz neutra:** "você", sem gíria regional nem palavrão. Kokoro, voz Alex. Números por extenso, sem dígitos nem
  símbolos (o `pipeline.voice` recusa).
- **Ambiente real:** nunca o `palco` de cor chapada. Explicação mostra o fenômeno (`effects` fogo, água, splash, som;
  `movers` carro, avião, barco), sem gente posando de onda.
- **Mundo coeso:** nada atravessa nada; objetos no mesmo lugar em todas as cenas (`dressing`); figurante só em
  calçada e até o fim; câmera sem pulos (um degrau, mesmo eixo); legenda embaixo, nunca no corpo.
- **Vídeo com vida:** câmera `keys` sempre em movimento, uma imagem por frase, ação a cada 1–2 s, pops
  (`skill/references/direcao.md`).
- **Sempre olhar os frames** (via revisor) antes de entregar.
- **Nada de terceiros no vídeo:** frames de outros canais só para comparar; música e efeitos são sintetizados.

**Pesquisa de perfis de referência** (quando o usuário manda links do TikTok):
- `yt-dlp --flat-playlist -J https://www.tiktok.com/@perfil` lista os vídeos com views. Quando o perfil bloquear, abra
  no Claude in Chrome e leia `[data-e2e="user-post-item"]`.
- Baixe os mais vistos e meça o ritmo de cortes (`ffmpeg … select='gt(scene,0.3)'`). Monte folhas de contato com
  `fps=1/3,tile=8x5`.
- **Transcrição:** o CLI do HyperFrames grava `transcript.json` ao lado do áudio, então cada arquivo precisa da sua
  própria pasta e um de cada vez. Senão um sobrescreve o outro.
- A música vem como "som original" (mixada): não dá para saber qual é pelos metadados.

## 6. Comandos e pegadinhas técnicas

- Testes: `npm test` (motor), `npm run typecheck`, `~/.venvs/shorts/bin/python -m unittest discover pipeline/tests`.
- Build: `npm run build && npm run validate:build`. Validar um vídeo: `~/.venvs/shorts/bin/python -m pipeline.assemble --check videos/<slug>`.
- Stills sem voz: `bash scripts/preview.sh videos/<slug>/video.json <pasta> t1,t2,…` (folha em `<pasta>/sheet.jpg`).
- Modelos: só CC0 em `kit/kenney/` (fora do git), registrados com `scripts/import-assets.sh <zip> <prefixo>`.
  Peças simples sem pacote: `node scripts/mk-props.mjs <pasta>` (jangada, chapa, canhão). Sem `zip` na máquina: use o
  `zipfile` do Python.
- Um `mover` existe na cena inteira, na posição inicial: para "aparecer", ele cai de `y` 8 (fora do quadro). Um
  objeto, um movimento por cena; dois movers no mesmo lugar aparecem duplicados.
- Atores ficam no chão (não sobem em barco). O quadro vertical é estreito: a 7 m, só cerca de ±1,5 m de largura.
- O validador confere a câmera em **todo corte no mesmo cenário** (direção ≤ 15°, deslocamento lateral ≤ 50% da
  distância, razão ≤ 2,5), mesmo com `xfade`. Comece cada cena no enquadramento em que a anterior terminou.
- `natureza`: o lago é uma elipse centrada em z −22 (raio 26 × 9); a margem perto dos spots fica em z ≈ −12.
- Peça nova por vídeo: no máximo uma (personagem ou cenário), salvo se o usuário escolher mais.
- Não mude números de `engine/style/`: o visual do perfil mora ali.
- Não faça commit sem o usuário pedir.
- Os campos `overlays` (DIA N, termo amarelo, placa) e `bw` (preto e branco) são do formato "você inventa": revisor,
  não aponte como erro.

## 7. Papéis dos workers

| Papel | Modelo | Faz | Entrega |
|---|---|---|---|
| `roteirista` | Claude Opus | pesquisa, `SCRIPT.md` (fatos com fonte + "Briefing visual (sugestão)") e `roteiro.txt` | tabela tempo · fala · tela |
| `diretor` | Codex | `video.json` a partir do briefing confirmado e do `words.json` | o que ficou de fora do kit |
| `motor` | Codex | recurso novo em `engine/` ou `scripts/`, com teste | arquivos mudados, como usar, o que ficou de fora |
| `cenografo` | Codex | um cenário novo genérico em `engine/sets/` + projeto de teste | id, views, spots, spec de teste |
| `corretor` | Codex | corrige o `video.json` quando o render falha | causa e mudança, em até 5 linhas |
| `revisor` | Claude Haiku | stills por cena contra `armadilhas.md` e o briefing; não edita nada | uma linha por cena + "RESULTADO: ok/corrigir" |

A sua **última mensagem** vai para `videos/<slug>/agentes/<papel>.txt` e é tudo o que o coordenador lê: seja direto.

## 8. Regras dos workers

**Skills que você segue** (leia os arquivos; o Codex não carrega skills):

- `~/.claude/skills/diretor-de-edicao/references/`: `roteiro.md`, `retencao.md`, `narracao.md`, `edicao.md`
  (gancho, retenção, ritmo).
- `~/.claude/skills/motion-designer/references/craft.md` (composição, movimento, zonas seguras).
- `skill/references/` do projeto: `formatos.md`, `direcao.md`, `cenas.md`, `kit.md`, `briefing-visual.md`,
  `armadilhas.md`, `nota.md`.

Em conflito, as duas skills de fora mandam em ritmo, roteiro e movimento. As referências do projeto só dizem o que o
motor sabe fazer.

**Regras de todo worker:**

- Trabalhe só no que o seu papel pede: o roteirista e o diretor só em `videos/<slug>/`; o corretor só no `video.json`;
  o revisor não edita nada.
- **Briefing visual confirmado manda.** Siga a seção "Briefing visual" do `SCRIPT.md` à risca e ignore a "(sugestão)".
- **Roteiro:** voz neutra ("você", sem gíria nem palavrão). Números por extenso, sem dígitos nem símbolos
  (% R$ / + links). Todo fato com fonte no `SCRIPT.md`. Gancho afirmativo, nada de "fica até o final".
- **Cena:**
  - Sempre num ambiente real, nunca o `palco`.
  - Câmera `keys` sempre em movimento, uma imagem nova por frase, ação a cada 1–2 s (`direcao.md`).
  - Nada atravessa nada, e os objetos ficam no mesmo lugar (`dressing`).
  - Legenda embaixo, fora do corpo de quem fala.
- **Motor:**
  - Não mude números de `engine/style/`.
  - Reaproveite o que existe, sem opção que o pedido não pede.
  - Toda lógica nova ganha teste; rode `npm test` e `npm run typecheck` até passar.
  - Atualize as referências da skill que o recurso muda.
- **Kit:** só modelos CC0 (Kenney, Quaternius). Personagem ou cenário novo tem id genérico (serve para outros vídeos).
  No máximo uma peça nova por vídeo, salvo se o briefing disser outra coisa.
- **Sandbox:** o Chrome não abre no Codex. Não renderize nem tire stills: render é do `scripts/render.sh`, stills são do
  revisor.
- **Validação:** `~/.venvs/shorts/bin/python -m pipeline.assemble --check videos/<slug>` antes de entregar um
  `video.json`.
- Nada de conteúdo de terceiros no vídeo (frames, música, logos).
- Não faça commit.
