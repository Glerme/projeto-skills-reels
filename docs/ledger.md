# SDD ledger — plan: docs/plano.md

Spec: docs/design.md. Repositório: ~/Documentos/projetos/projeto-reels, branch feat/shorts-cartoon (base 8878ffd em main).

Ruling: branch feat/shorts-cartoon no próprio repo em vez de worktree. Motivo: o repo foi criado agora e não tem outro trabalho em andamento. Custo se errado: nenhum, dá para mover para worktree depois.
Ruling: o git init da Tarefa 1 já foi feito (commit 8878ffd, .gitignore incluído). A Tarefa 1 só completa o .gitignore. Custo se errado: nenhum.

## Pre-flight scan
| Itens | Produz / consome | Achado | Ruling |
|---|---|---|---|
| T1 ↔ T5 | T1 define `npm run build` a partir de engine/main.ts, que só nasce na T5 | o build falharia na T1 | Ruling: a T1 só declara o script e o roda pela primeira vez na T5. Custo se errado: nenhum. |
| T1 ↔ T6 | T1 tira buildTown/flagTex do build.ts; T6 precisa do buildTown original | a T5 apaga prototipo-hyperframes/, a fonte | Ruling: a T6 lê buildTown de ~/Documentos/projetos/claude-animated-shorts/templates/bridge/build.ts. Custo se errado: nenhum. |
| T2 ↔ T4 | CharDef.build inclui elder/slim, que o toon só ganha na T4 | só tipos, compila | ok |
| T2 ↔ T5–8 | ANCHORS (nomes) ↔ SetDef.spots/views | precisam bater | Ruling: na T5, um teste confere que cada SETS[id] tem exatamente os nomes de ANCHORS[id]; cada tarefa de cenário (T6–8) mantém o teste verde. Custo se errado: cenário quebra no validador. |
| T4 interno | chars.ts (bundle do navegador) com loadCharacters usando fs | fs no bundle do navegador quebra o esbuild | Ruling: loadCharacters fica em engine/cast/load-chars.ts (só node, só testes). Custo se errado: nenhum. |
| T2 ↔ T13 | dist/validate.mjs via `npm run validate:build` | ok | ok |
| T3 ↔ T5 | Cam/V3 de camera.ts nas views do SetDef | ok | ok |
| T5 ↔ T13 | marcadores {{DURATION}} {{SPEC}} {{CAPTIONS_HOST}} {{FICTION_BADGE}} no template | ok | ok |
| T10 ↔ T11 ↔ T12 | Word TypedDict, Mood, SfxCue em Python com os mesmos nomes do TS | ok | Ruling: os tipos Python ficam em pipeline/types.py (Word, Group, SfxCue, Mood). Custo se errado: nenhum. |
| T14 ↔ T5 | render.sh em videos/_teste-palco, que não tem voz nem words | o pipeline falharia | Ruling: a T14 roda render.sh numa cópia montada de pipeline/tests/fixtures/mini (T13), que tem voz. Custo se errado: nenhum. |
| T9 | aprovação do usuário no meio do plano | conflita com a execução contínua | Ruling: a spec manda (aprovação única do kit), então paro na T9 e peço ao usuário. Custo se errado: uma espera. |
| T15 passo 2 | "abra uma sessão nova" | um subagente não consegue | Ruling: verifico o frontmatter e o link; o usuário confirma na próxima sessão. Custo se errado: nenhum. |
| T16 | precisa do usuário (tema, aprovações) | — | Ruling: a T16 fica comigo e com o usuário, sem subagente implementador. |
| T1..T16 cada | testes ↔ código, arquivos criados ↔ tocados | sem contradição interna além das acima | ok |

## Progresso
Task 1: dispatched (base 476bace)
Ruling: o cards.ts da T1 ficou só com as linhas 1–119 do cast.ts. Os auxiliares genéricos das linhas 120–224 (sunOf/findSun, light2D, viewOf, tier, lidAt) vão para a T5, que os tira de ~/Documentos/projetos/claude-animated-shorts/templates/bridge/cast.ts. Motivo: estão misturados com constantes da ponte. Custo se errado: a T5 reescreve um pouco mais.
Task 1: minor (deferred): .gitignore com entradas extras; CardStage sem alias; ferramentas de build em dependencies em vez de devDependencies; chapelTex/clockTex removidos junto com buildTown.
Task 1: complete (commits 476bace..2a3f78f, review clean)
Task 2: dispatched (base 2a3f78f)
Task 2: minor (deferred): o validador trava (TypeError) com ator nulo ou expr que não é tupla, em vez de dar erro; `in` aceita chaves herdadas (use Object.hasOwn); um set desconhecido faz return cedo e pula as outras checagens da cena; recipe e tipo de xfade não são validados; toFixed(1) esconde buracos < 0,1 s; o xfade da 1ª cena não é rejeitado; faltam testes de cast, focus, punch, kicks, expr e glide sem to; o fixture usa caminho relativo.
Task 2: complete (commits 2a3f78f..285517b, review clean)
Task 3: dispatched (base 285517b)
Task 3: minor (deferred): o kick move o look junto com a câmera (truck); punch durante o glide é ignorado; o loop de creep é O(f); o teste usa `as any`; com look vertical o kick lateral é zero; janela do punch [p, p+6) é ambígua em 1 frame.
Task 3: fix round 1 dispatched (FIX_BASE fcf6848) — direção lateral do kick espelhada
Task 3: fix round 1/5 (1 resolvido, 0 em aberto — direção lateral do kick; commits fcf6848..5cfb221)
Task 3: complete (commits 285517b..5cfb221, review clean)
Task 4: dispatched (base 5cfb221)
Ruling: a T4 adiciona ao toon.ts dois campos opcionais, FrontOpts.arms ("point" | "cheer") e FrontOpts.talk (boca aberta), sem mudar o desenho padrão. Motivo: o plano pede as ações point, cheer e talk, mas o toon não tinha controle de braço nem de boca. Custo se errado: retocar o desenho dos braços.
Ruling: Task 4 Important 1 (balanço de caminhada de 3 % pico a pico, não 5 %): aceito. Motivo: os "Look targets" do SKILL.md medem 3–7 % na referência, e o plano manda não mexer nos números do estilo; os 5 % eram da marcha dos soldados. Custo se errado: a caminhada fica um pouco mais suave do que deveria; ajustável depois com um campo `bob` opcional.
Task 4: minor (deferred): comentário estranho e varredura O(n) no blinkAt; `seed % 5` negativo com seed negativo; operário de boné em vez de capacete; memo global do blink cresce; cheer + rifle e o sinal da inclinação do idoso não foram checados visualmente (fica para os stills da T5).
Task 4: fix round 1 dispatched (FIX_BASE 6c94cd5) — o teste do kit compara só os nomes
Task 4: fix round 1/5 (1 resolvido, 0 em aberto — o teste do kit agora compara o conteúdo; commits 6c94cd5..259169b)
Task 4: complete (commits 5cfb221..259169b, review clean)
Task 5: dispatched (base 259169b)
Ruling: a T5 usa o modelo opus, por pedir julgamento de design entre vários arquivos e checagem visual. Os cenários ainda não feitos entram em SETS como placeholder que lança "cenário ainda não implementado". Os spots e views ficam em arquivos puros, para os testes em node. Custo se errado: retrabalho de estrutura nas T6–8.
Ruling: se o download dos modelos Kenney falhar, a T5 segue sem eles (o loadKit tolera a falta) e reporta. Custo se errado: cenários sem árvores e props até alguém baixar à mão.
Ruling: Task 5, sem contorno preto no chão do palco: aceito. Motivo: as regras de ink do SKILL.md dizem que não há linha na junção parede/chão, e um piso liso não tem silhueta; a exigência do plano estava errada. Custo se errado: o palco fica um pouco "flutuante"; dá para adicionar uma linha de base depois.
Ruling: Task 5, aberto com fov 65 e fundo inclinado 30°: aceito, são valores do conteúdo do cenário e não do estilo. Custo se errado: reenquadrar o palco.
Task 5: minor (deferred): mk-test-video.sh substitui os marcadores em sequência (um {{DURATION}} dentro do spec também seria trocado); ln -sfn num assets/kenney real cria o link dentro dele; o expr depende de a lista estar ordenada por tempo (o validador não checa a ordem); a inclinação do idoso quase não aparece; a luz golden no palco não foi checada.
Task 5: fix round 1 dispatched (FIX_BASE a1becdd) — a página não valida o spec nem mostra erros de carregamento
Task 5: fix round 1/5 (1 resolvido parcialmente, 1 em aberto — um spec malformado ainda trava o validador antes do catch; ready.then sem catch; commits a1becdd..7ccd67f)
Ruling: o minor da Task 2 (validador trava com ator nulo, expr que não é tupla, kicks que não é array) agora pesa no resultado: entra no fix round 2 da T5, corrigido em spec.ts. Custo se errado: nenhum.
Task 5: fix round 2 dispatched (FIX_BASE 7ccd67f)
Task 5: fix round 2/5 (2 resolvidos, 0 em aberto — o validador nunca lança, erro de parse vira ERRO, sem rejeição duplicada; commits 7ccd67f..94d0ed0)
Task 5: minor (deferred): o validador não checa o tipo de xfade (aceita string/null) nem de id; waitUntil ausente com spec inválido deixa uma promise sem tratamento.
Task 5: complete (commits 259169b..94d0ed0, review clean)
Task 6: dispatched (base 94d0ed0)
Task 6: dispatch bloqueado 2x pelo classificador do auto mode ([Auto-Mode Bypass]); nada implementado. Aguardando o usuário.
Ruling: execução trocada para inline (executing-plans) a partir da Task 6, por escolha do usuário depois de 2 bloqueios do classificador. Custo se errado: menos revisão por tarefa; a revisão final continua.
Task 6: Ruling: os spots esquerda/direita da rua ficaram em ±1,6 (eram ±2) e as views aberto/aereo foram reajustadas depois dos stills (mulher fora do quadro no aberto; personagens na borda e lampião cortado no aereo). Custo se errado: reenquadrar.
Task 6: Ruling: um pátio de pedra embaixo das fileiras de casas, para a casa que as linhas de visão removem virar pátio e não um buraco de grama. Custo se errado: nenhum.
Task 6: minor (deferred): o meio-fio do lado direito sai tracejado no aereo (contorno quebrado nos quads da calçada).
Task 6: complete (commits 94d0ed0..1fdcf33, tests: npm test → # duration_ms 82.219545)
Task 7: Ruling: a casca do cômodo (chão, paredes, teto) fica na camada NOINK e não projeta sombra. Assim não há contorno nas junções parede/chão e o sol relativo à câmera entra no cômodo; os móveis continuam com contorno completo. Custo se errado: sem as dobras côncavas de contorno onde os móveis tocam o chão.
Task 7: Ruling: SetDef.sunAz opcional (stage.ts usa def.sunAz ?? L.az); os interiores usam 130°, com o sol do lado da câmera. Motivo: com o preset, as paredes voltadas para a câmera ficavam em contraluz, lavanda-acinzentadas, o que viola "nunca lavanda". Custo se errado: a luz do interior não "entra pela janela" de forma literal.
Task 7: Ruling: teto com MeshBasic (sem luz), na cor da parede clareada. Motivo: virado para baixo, ele ficaria sempre na sombra lavanda. Custo se errado: o teto não recebe sombras.
Task 7: Ruling: spots esquerda/direita dos cômodos em ±1,05 e aberto em z 4,85 / fov 64, porque o quadro vertical cortava os personagens dos lados. Custo se errado: cabem menos personagens lado a lado.
Task 7: minor (deferred): os interiores de dia ainda ficam claros demais (mediana de luma 0,78–0,82 contra ~0,57 na referência); fica para o ajuste de cor da T9. Cômodos um pouco vazios nos planos abertos.
Task 7: complete (commits 1fdcf33..2b2b5b0, tests: npm test → # duration_ms 98.521792)
Task 8: Ruling: o lago da natureza é uma superfície pintada estática, não o shader animado do rio. Motivo: SetDef não tem gancho por frame, e o lago fica ao fundo. Custo se errado: a água não se mexe.
Task 8: Ruling: sem flores Kenney na natureza (nesse tamanho viram "caixas roxas", a armadilha dos tufos-caixa) e grama da campina multiplicada por #c8d2a4 (estava limão). Custo se errado: campina menos enfeitada.
Task 8: minor (deferred): laboratório um pouco vazio, com vidraria pequena; o verde da natureza ainda é forte; personagens de esquerda/direita perto da borda no aberto da natureza.
Task 8: complete (commits 2b2b5b0..faa892b, tests: npm test → # duration_ms 100.876188)
Task 9: Ruling: a comparação com a referência foi feita por mim, e não por um verificador Opus separado. Motivo: os disparos de subagente estão bloqueados pelo classificador. Custo se errado: a avaliação do próprio autor é mais fraca.
Task 9: rodada 1 de ajuste feita (commit acima); notas abaixo da meta em cor de dia (6/7) e composição (5/6); aguardando a aprovação do usuário (spec: aprovação única do kit).
Task 9: aprovado pelo usuário ("pode seguir"), depois de ver docs/kit/kit-v1.jpg e as notas.
Task 9: complete (commits faa892b..9460ab9, tests: npm test → # duration_ms 110.42579)
Task 10: Ruling: um venv único para o pipeline, ~/.venvs/shorts (kokoro-onnx, soundfile, numpy, scipy, pillow), criado por scripts/setup_venv.sh, em vez do setup_kokoro.sh/~/.venvs/kokoro do plano. Motivo: o Python do sistema não tem numpy, e o som (T12) precisa dele. Os testes do pipeline rodam com ~/.venvs/shorts/bin/python. Custo se errado: um nome de venv diferente do plano.
Task 10: Ruling: os tipos Python ficam em pipeline/types.py (Word, Group, SfxCue, Mood), conforme o pre-flight.
Task 10: complete (commits 9460ab9..b9d0c43, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Task 11: Ruling: captions.py exporta host_html(duration), o host com data-track-kind="captions" usado pela montagem (T13); a sub-composição tem um show e um hard kill explícitos por grupo, sobre o span interno. Custo se errado: nenhum.
Task 11: Ruling: a legenda quebra em 2 linhas acima de 14 caracteres, no espaço mais perto do meio, com a fonte ajustada à linha mais longa (fitTextFontSize, 42–78 px, maxWidth 900). Contorno de 0,3em com paint-order stroke (o modelo E é grosso). Custo se errado: retocar o tamanho.
Task 11: Ruling: o look dos closes desceu de y 1,5 para 1,25 em todos os cenários, para o rosto ficar acima da legenda (o guia do HF manda nunca cobrir o rosto). Custo se errado: closes com um pouco mais de corpo.
Task 11: complete (commits b9d0c43..5bad7a9, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Task 12: Ruling: a mixagem expõe duck_curve(words, n) e o teste do "duck" verifica essa curva (−3 dB no meio da fala, 0 longe dela), e não o stem. Motivo: a trilha varia sozinha, então comparar o RMS do stem não seria um teste estável. Custo se errado: nenhum (o mix usa a mesma curva).
Task 12: Ruling: níveis do mix = voz sem alteração; trilha 9 dB abaixo da voz (integrado) e −3 dB a mais durante a fala; efeitos com pico momentâneo 6 dB abaixo do pico da voz (+gainDb); master em −14 LUFS e limitador em −1,2 dBTP (o limitador da ponte, simplificado). A "música +3 / SFX −6" da skill original virou essa relação. Custo se errado: retocar 2 constantes.
Task 12: minor (deferred): o release do limitador é um loop Python por amostra (~1 s por passada em 60 s de áudio, 3 passadas); as trilhas são simples (progressão de 4 acordes) e ninguém ouviu ainda: amostras em assets/som/mix-*.wav.
Task 12: complete (commits 5bad7a9..ec361b2, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Pausa (limite de uso): tarefas 1–12 completas; retomar na Task 13. Nota: docs/RETOMADA.md
Task 13: Ruling: a montagem valida o spec antes de mixar (o mix é a parte lenta) e não escreve o index.html se o spec for inválido; o selo FICÇÃO é um clip (id fiction-badge) no canto superior direito, a 120 px do topo e 80 px da direita. Custo se errado: nenhum.
Task 13: Ruling: words.transcribe agora apaga o transcript.json que o CLI do HF deixa ao lado do áudio (só se ele não existia antes). Era um efeito colateral da T10. Custo se errado: nenhum.
Task 13: complete (commits ac56ffc..804071c, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Task 14: Ruling: o QA trata as trocas de legenda como mudanças planejadas, além de cortes, crossfades e flashes. Motivo: na mini, os 2 "pulos" eram exatamente as trocas de legenda (frames 3 e 36). Custo se errado: um pulo real no mesmo frame de uma troca de legenda passaria sem aviso.
Task 14: Ruling: render.sh usa `hyperframes render --quality delivery` e reprova se o check tiver qualquer finding de severidade error em lint/runtime/layout/audio. Mini renderizada em 9 s (GPU, beginframe) e QA limpo (−14,1 LUFS); cópia em assets/exemplos/mini-polvo.mp4.
Task 14: complete (commits 804071c..8a4c3dc, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Task 15: Ruling: a skill não passou pelos testes de pressão com subagente que a writing-skills pede (subagentes bloqueados). O teste real é a T16, um vídeo seguindo só a skill. Custo se errado: lacunas na skill só aparecem no primeiro uso.
Task 15: Ruling: novo `python -m pipeline.assemble --check videos/<slug>`, porque o validador direto rejeita elenco citado por id (só a montagem resolve o acervo); o exemplo de video.json em cenas.md foi validado. Custo se errado: nenhum.
Task 15: Ruling: o passo 2 do plano ("abra sessão nova e confira a skill na lista") foi checado nesta sessão: a skill shorts-cartoon apareceu na lista de skills disponíveis logo depois da criação do link. Custo se errado: nenhum.
Task 15: complete (commits 8a4c3dc..21646d6, tests: /home/gui/.venvs/shorts/bin/python -m unittest discover pipeline/tests → OK)
Task 16: Ruling: o usuário trocou o tema do primeiro vídeo de "curiosidade" para "história bíblica" (Davi e Golias, 1 Samuel 17): história narrada, fiction false, nenhuma citação literal (só narração e paráfrases marcadas no SCRIPT.md com o versículo).
Task 16: Ruling: CharDef.scale (0,5–2) no spec e no stage; o gigante (scale 1,6) entra no acervo como peça nova, a única do vídeo. Custo se errado: nenhum (opcional).
Task 16: Ruling: os spots esquerda/direita da natureza vão de ±1,6 para ±1,1 (saíam do quadro vertical). Davi virou slim com escala 0,9, e os closes dele viraram medio+push (rosto sob a legenda). O QA passa a tratar kicks como planejados. Custo se errado: reenquadrar.
Task 16: render 63,7 s, QA limpo (−14,3 LUFS); vídeo final aguardando a aprovação 2 do usuário. Nada publicado.
